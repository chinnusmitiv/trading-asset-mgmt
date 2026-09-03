/**
 * Application Runtime Configuration
 */

export const APP_CONFIG = {
  APP_NAME: 'Vantara Trading Company',
  VERSION: '1.0.0',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_CURRENCY_SYMBOL: '₹',
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  IDEMPOTENCY_HEADER: 'X-Request-Id',
  STORAGE_KEYS: {
    AUTH_TOKEN: '@auth_session_token',
    AUTH_USER: '@auth_user_profile',
    APP_SETTINGS: '@app_settings_config'
  },
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycby_mock_script_id/exec',
  USE_MOCK_DATA: true // Default to true so app works immediately out of the box
};
