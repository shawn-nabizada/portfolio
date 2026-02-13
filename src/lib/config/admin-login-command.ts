const ADMIN_LOGIN_COMMAND_ENV = "ADMIN_LOGIN_COMMAND";

export function getAdminLoginCommand(): string {
  const rawValue = process.env.ADMIN_LOGIN_COMMAND;

  if (!rawValue) {
    throw new Error(
      `[config] Missing required env ${ADMIN_LOGIN_COMMAND_ENV}. Set a secret single-token terminal login command.`
    );
  }

  const command = rawValue.trim();
  if (!command || /\s/.test(command)) {
    throw new Error(
      `[config] Invalid ${ADMIN_LOGIN_COMMAND_ENV}. Value must be a non-empty single token without spaces.`
    );
  }

  return command;
}
