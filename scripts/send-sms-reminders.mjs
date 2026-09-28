import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

const DEFAULT_MESSAGE = "Bakeoff Tipping Reminder: please enter your picks for this week - https://leepwk.github.io/bakeoff/ :D Phil";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const parts = [
      error.message,
      error.details,
      error.hint,
      error.code ? `code=${error.code}` : null,
      error.status ? `status=${error.status}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const client = twilio(
  requireEnv("TWILIO_API_KEY_SID"),
  requireEnv("TWILIO_API_KEY_SECRET"),
  { accountSid: requireEnv("TWILIO_ACCOUNT_SID") }
);

const fromNumber = requireEnv("TWILIO_PHONE_NUMBER");
const githubRunId = requireEnv("GITHUB_RUN_ID");
const messageText = process.env.MESSAGE_TEXT?.trim() || DEFAULT_MESSAGE;

async function main() {
  console.log("Loading current week...");
  const { data: weeks, error: weekError } = await supabase
    .from("weeks")
    .select("id, week_number, title, is_current, is_locked")
    .eq("is_current", true);

  if (weekError) throw weekError;
  if (!weeks?.length) throw new Error("No current week is configured. No SMS reminders were sent.");
  if (weeks.length !== 1) throw new Error(`Expected exactly one current week, found ${weeks.length}. No SMS reminders were sent.`);

  const week = weeks[0];
  if (week.is_locked) {
    console.log(`Week ${week.week_number} is locked. No SMS reminders needed.`);
    return;
  }

  console.log(`Current week: ${week.week_number} - ${week.title || "Untitled"}`);

  console.log("Loading enabled SMS recipients...");
  const { data: settings, error: settingsError } = await supabase
    .from("player_sms_settings")
    .select("player_id, phone_number, sms_reminders_enabled")
    .eq("sms_reminders_enabled", true)
    .not("phone_number", "is", null);

  if (settingsError) throw settingsError;
  if (!settings?.length) {
    console.log("No players have SMS reminders enabled.");
    return;
  }

  const playerIds = settings.map((row) => row.player_id);

  const [{ data: predictions, error: predictionsError }, { data: players, error: playersError }, { data: runMessages, error: runMessagesError }] = await Promise.all([
    supabase
      .from("predictions")
      .select("player_id")
      .eq("week_id", week.id)
      .in("player_id", playerIds),
    supabase
      .from("players")
      .select("id, name")
      .in("id", playerIds),
    supabase
      .from("sms_messages")
      .select("player_id, status")
      .eq("github_run_id", githubRunId)
      .eq("week_id", week.id)
      .in("status", ["pending", "sent"]),
  ]);

  if (predictionsError) throw predictionsError;
  if (playersError) throw playersError;
  if (runMessagesError) throw runMessagesError;

  const submittedPlayerIds = new Set((predictions || []).map((row) => row.player_id));
  const alreadyAttemptedPlayerIds = new Set((runMessages || []).map((row) => row.player_id));
  const playerNames = new Map((players || []).map((row) => [row.id, row.name]));

  const recipients = settings.filter(
    (row) => !submittedPlayerIds.has(row.player_id) && !alreadyAttemptedPlayerIds.has(row.player_id)
  );

  console.log(`${submittedPlayerIds.size} enabled player(s) already submitted predictions.`);
  console.log(`${recipients.length} reminder(s) to send.`);

  for (const recipient of recipients) {
    const playerName = playerNames.get(recipient.player_id) || recipient.player_id;
    const attemptedAt = new Date().toISOString();
    let logId = null;

    try {
      const { data: logRow, error: logError } = await supabase
        .from("sms_messages")
        .insert({
          player_id: recipient.player_id,
          week_id: week.id,
          phone_number: recipient.phone_number,
          message_type: "prediction_reminder",
          message_text: messageText,
          status: "pending",
          provider: "twilio",
          github_run_id: githubRunId,
          scheduled_for: attemptedAt,
          attempted_at: attemptedAt,
        })
        .select("id")
        .single();

      if (logError) throw logError;
      logId = logRow.id;

      console.log(`Sending reminder to ${playerName}...`);
      const message = await client.messages.create({
        from: fromNumber,
        to: recipient.phone_number,
        body: messageText,
      });

      const { error: updateError } = await supabase
        .from("sms_messages")
        .update({
          status: "sent",
          provider_message_id: message.sid,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", logId);

      if (updateError) throw updateError;
      console.log(`Sent reminder to ${playerName}. Twilio SID: ${message.sid}`);
    } catch (error) {
      const message = errorMessage(error);
      console.error(`Failed reminder for ${playerName}: ${message}`);

      if (logId) {
        const { error: updateError } = await supabase
          .from("sms_messages")
          .update({
            status: "failed",
            error_message: message.slice(0, 2000),
          })
          .eq("id", logId);

        if (updateError) {
          console.error(`Could not update failed log for ${playerName}: ${errorMessage(updateError)}`);
        }
      }
    }
  }
}

main().catch((error) => {
  console.error("Reminder workflow failed:", errorMessage(error));
  process.exitCode = 1;
});
