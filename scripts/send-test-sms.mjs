import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

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

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseSecretKey = requireEnv("SUPABASE_SECRET_KEY");
const twilioAccountSid = requireEnv("TWILIO_ACCOUNT_SID");
const twilioApiKeySid = requireEnv("TWILIO_API_KEY_SID");
const twilioApiKeySecret = requireEnv("TWILIO_API_KEY_SECRET");
const twilioPhoneNumber = requireEnv("TWILIO_PHONE_NUMBER");
const playerId = requireEnv("PLAYER_ID");
const messageText = process.env.MESSAGE_TEXT?.trim() || "Bakeoff Tipping Reminder: please enter your picks for this week. :D Phil - PS. do not reply to this text";
const githubRunId = process.env.GITHUB_RUN_ID || null;

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const client = twilio(twilioApiKeySid, twilioApiKeySecret, {
  accountSid: twilioAccountSid,
});

let logId = null;

try {
  console.log("Looking up player...");
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", playerId)
    .single();

  if (playerError) throw playerError;

  console.log("Loading SMS settings...");
  const { data: settings, error: settingsError } = await supabase
    .from("player_sms_settings")
    .select("player_id, phone_number, sms_reminders_enabled")
    .eq("player_id", playerId)
    .single();

  if (settingsError) throw settingsError;
  if (!settings.phone_number) throw new Error(`${player.name} does not have a phone number configured.`);

  const attemptedAt = new Date().toISOString();

  console.log("Creating pending SMS log...");
  const { data: logRow, error: logError } = await supabase
    .from("sms_messages")
    .insert({
      player_id: playerId,
      week_id: null,
      phone_number: settings.phone_number,
      message_type: "test",
      message_text: messageText,
      status: "pending",
      provider: "twilio",
      github_run_id: githubRunId,
      attempted_at: attemptedAt,
    })
    .select("id")
    .single();

  if (logError) throw logError;
  logId = logRow.id;

  console.log("Calling Twilio...");
  const message = await client.messages.create({
    from: twilioPhoneNumber,
    to: settings.phone_number,
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

  console.log(`Test SMS sent to ${player.name} (${settings.phone_number}). Twilio SID: ${message.sid}`);
} catch (error) {
  const message = errorMessage(error);

  if (logId) {
    const { error: updateError } = await supabase
      .from("sms_messages")
      .update({
        status: "failed",
        error_message: message.slice(0, 2000),
      })
      .eq("id", logId);

    if (updateError) {
      console.error("Could not update failed SMS log row:", updateError.message);
    }
  }

  console.error("Test SMS failed:", message);
  process.exitCode = 1;
}
