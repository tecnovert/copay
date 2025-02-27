import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import env from '../../environments';
import { Logger } from '../../providers/logger/logger';

@Injectable()
export class RateProvider {
  private rates;
  private alternatives;
  private ratesBCH;
  private ratesPART;
  private ratesBtcAvailable: boolean;
  private ratesBchAvailable: boolean;
  private ratesPartAvailable: boolean;

  private SAT_TO_BTC: number;
  private BTC_TO_SAT: number;

  private rateServiceUrl = env.ratesAPI.btc;
  private bchRateServiceUrl = env.ratesAPI.bch;
  private partRateServiceUrl = env.ratesAPI.part;

  constructor(private http: HttpClient, private logger: Logger) {
    this.logger.debug('RateProvider initialized');
    this.rates = {};
    this.alternatives = [];
    this.ratesBCH = {};
    this.ratesPART = {};
    this.SAT_TO_BTC = 1 / 1e8;
    this.BTC_TO_SAT = 1e8;
    this.ratesBtcAvailable = false;
    this.ratesBchAvailable = false;
    this.updateRatesBtc();
    this.updateRatesBch();
    this.updateRatesPart();
  }

  public updateRatesBtc(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getBTC()
        .then(dataBTC => {
          _.each(dataBTC, currency => {
            this.rates[currency.code] = currency.rate;
            this.alternatives.push({
              name: currency.name,
              isoCode: currency.code,
              rate: currency.rate
            });
          });
          this.ratesBtcAvailable = true;
          resolve();
        })
        .catch(errorBTC => {
          this.logger.error(errorBTC);
          reject(errorBTC);
        });
    });
  }

  public updateRatesBch(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getBCH()
        .then(dataBCH => {
          _.each(dataBCH, currency => {
            this.ratesBCH[currency.code] = currency.rate;
          });
          this.ratesBchAvailable = true;
          resolve();
        })
        .catch(errorBCH => {
          this.logger.error(errorBCH);
          reject(errorBCH);
        });
    });
  }

  public updateRatesPart(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getPART().then(dataPART => {
        const rate_btc = dataPART['particl']['btc'];
        this.getBTC()
          .then(dataBTC => {
            _.each(dataBTC, currency => {
              this.ratesPART[currency.code] = currency.rate * rate_btc;
            });
            this.ratesPartAvailable = true;
            resolve();
          })
          .catch(errorPART => {
            this.logger.error(errorPART);
            reject(errorPART);
          });
      });
    });
  }

  public getPART(): Promise<any> {
    return new Promise(resolve => {
      this.http.get(this.partRateServiceUrl).subscribe(data => {
        resolve(data);
      });
    });
  }

  public getBTC(): Promise<any> {
    return new Promise(resolve => {
      this.http.get(this.rateServiceUrl).subscribe(data => {
        resolve(data);
      });
    });
  }

  public getBCH(): Promise<any> {
    return new Promise(resolve => {
      this.http.get(this.bchRateServiceUrl).subscribe(data => {
        resolve(data);
      });
    });
  }

  public getRate(code: string, chain?: string): number {
    if (chain == 'bch') return this.ratesBCH[code];
    if (chain == 'part') return this.ratesPART[code];
    else return this.rates[code];
  }

  public getAlternatives() {
    return this.alternatives;
  }

  public isBtcAvailable() {
    return this.ratesBtcAvailable;
  }

  public isBchAvailable() {
    return this.ratesBchAvailable;
  }

  public isPartAvailable() {
    return this.ratesPartAvailable;
  }

  public toFiat(satoshis: number, code: string, chain: string): number {
    if (
      (!this.isBtcAvailable() && chain == 'btc') ||
      (!this.isBchAvailable() && chain == 'bch') ||
      (!this.isPartAvailable() && chain == 'part')
    ) {
      return null;
    }
    return satoshis * this.SAT_TO_BTC * this.getRate(code, chain);
  }

  public fromFiat(amount: number, code: string, chain: string): number {
    if (
      (!this.isBtcAvailable() && chain == 'btc') ||
      (!this.isBchAvailable() && chain == 'bch') ||
      (!this.isPartAvailable() && chain == 'part')
    ) {
      return null;
    }
    return (amount / this.getRate(code, chain)) * this.BTC_TO_SAT;
  }

  public listAlternatives(sort: boolean) {
    let alternatives = _.map(this.getAlternatives(), (item: any) => {
      return {
        name: item.name,
        isoCode: item.isoCode
      };
    });
    if (sort) {
      alternatives.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });
    }
    return _.uniqBy(alternatives, 'isoCode');
  }

  public whenRatesAvailable(chain: string): Promise<any> {
    return new Promise(resolve => {
      if (
        (this.ratesBtcAvailable && chain == 'btc') ||
        (this.ratesBchAvailable && chain == 'bch') ||
        (this.ratesPartAvailable && chain == 'part')
      )
        resolve();
      else {
        if (chain == 'btc') {
          this.updateRatesBtc().then(() => {
            resolve();
          });
        }
        if (chain == 'bch') {
          this.updateRatesBch().then(() => {
            resolve();
          });
        }
        if (chain == 'part') {
          this.updateRatesPart().then(() => {
            resolve();
          });
        }
      }
    });
  }
}
