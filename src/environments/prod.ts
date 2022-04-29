import { EnvironmentSchema } from './schema';

/**
 * Environment: prod
 */
const env: EnvironmentSchema = {
  name: 'production',
  enableAnimations: true,
  ratesAPI: {
    btc: 'https://bitpay.com/api/rates',
    bch: 'https://bitpay.com/api/rates/bch',
    part: 'https://api.coingecko.com/api/v3/simple/price?ids=particl\&vs_currencies=btc'
  },
  activateScanner: true
};

export default env;
