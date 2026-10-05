// High-precision BigNumber class supporting numbers up to 10^(9e15)
// Stores number as mantissa * 10^exponent where 1 <= |mantissa| < 10

export class BigNum {
  constructor(mantissa = 0, exponent = 0) {
    if (mantissa instanceof BigNum) {
      this.m = mantissa.m;
      this.e = mantissa.e;
      return;
    }

    if (typeof mantissa === 'string') {
      const parsed = BigNum.fromString(mantissa);
      this.m = parsed.m;
      this.e = parsed.e;
      return;
    }

    if (typeof mantissa === 'number') {
      if (mantissa === 0 || !isFinite(mantissa)) {
        this.m = 0;
        this.e = 0;
        return;
      }
      // Standard number conversion
      let m = mantissa;
      let e = exponent;
      if (Math.abs(m) > 0) {
        const expShift = Math.floor(Math.log10(Math.abs(m)));
        m = m / Math.pow(10, expShift);
        e += expShift;
      }
      this.m = m;
      this.e = e;
      this.normalize();
      return;
    }

    this.m = 0;
    this.e = 0;
  }

  static from(val) {
    if (val instanceof BigNum) return val;
    return new BigNum(val);
  }

  static zero() {
    return new BigNum(0, 0);
  }

  static one() {
    return new BigNum(1, 0);
  }

  static fromString(str) {
    if (!str || str === '0') return new BigNum(0, 0);
    const clean = str.trim().toLowerCase();
    if (clean.includes('e')) {
      const parts = clean.split('e');
      const m = parseFloat(parts[0]);
      const e = parseInt(parts[1], 10);
      return new BigNum(m, e);
    }
    const val = parseFloat(clean);
    return new BigNum(val);
  }

  normalize() {
    if (this.m === 0 || isNaN(this.m)) {
      this.m = 0;
      this.e = 0;
      return this;
    }

    const absM = Math.abs(this.m);
    if (absM >= 10 || absM < 1) {
      const shift = Math.floor(Math.log10(absM));
      this.m = this.m / Math.pow(10, shift);
      this.e += shift;
    }

    if (Math.abs(this.m) < 1e-12) {
      this.m = 0;
      this.e = 0;
    }

    return this;
  }

  add(other) {
    const o = BigNum.from(other);
    if (this.m === 0) return new BigNum(o.m, o.e);
    if (o.m === 0) return new BigNum(this.m, this.e);

    const diff = this.e - o.e;
    if (diff > 16) return new BigNum(this.m, this.e);
    if (diff < -16) return new BigNum(o.m, o.e);

    if (diff >= 0) {
      const newM = this.m + o.m * Math.pow(10, -diff);
      return new BigNum(newM, this.e);
    } else {
      const newM = this.m * Math.pow(10, diff) + o.m;
      return new BigNum(newM, o.e);
    }
  }

  sub(other) {
    const o = BigNum.from(other);
    if (o.m === 0) return new BigNum(this.m, this.e);
    if (this.m === 0) return new BigNum(-o.m, o.e);

    const diff = this.e - o.e;
    if (diff > 16) return new BigNum(this.m, this.e);
    if (diff < -16) return new BigNum(-o.m, o.e);

    if (diff >= 0) {
      const newM = this.m - o.m * Math.pow(10, -diff);
      return new BigNum(newM, this.e);
    } else {
      const newM = this.m * Math.pow(10, diff) - o.m;
      return new BigNum(newM, o.e);
    }
  }

  mul(other) {
    const o = BigNum.from(other);
    if (this.m === 0 || o.m === 0) return BigNum.zero();
    return new BigNum(this.m * o.m, this.e + o.e);
  }

  div(other) {
    const o = BigNum.from(other);
    if (o.m === 0) throw new Error('Division by zero in BigNum');
    if (this.m === 0) return BigNum.zero();
    return new BigNum(this.m / o.m, this.e - o.e);
  }

  pow(exp) {
    if (exp === 0) return BigNum.one();
    if (this.m === 0) return BigNum.zero();
    if (typeof exp !== 'number') exp = Number(exp);

    // log10(m * 10^e) = log10(m) + e
    const log10Val = (Math.log10(Math.abs(this.m)) + this.e) * exp;
    const newExp = Math.floor(log10Val);
    const newM = Math.pow(10, log10Val - newExp) * (this.m < 0 && exp % 2 !== 0 ? -1 : 1);
    return new BigNum(newM, newExp);
  }

  floor() {
    if (this.e < 0) return BigNum.zero();
    if (this.e > 16) return new BigNum(this.m, this.e);
    const val = Math.floor(this.toNumber());
    return new BigNum(val);
  }

  ceil() {
    if (this.e < 0) return this.m > 0 ? BigNum.one() : BigNum.zero();
    if (this.e > 16) return new BigNum(this.m, this.e);
    const val = Math.ceil(this.toNumber());
    return new BigNum(val);
  }

  round() {
    if (this.e < 0) return Math.abs(this.toNumber()) >= 0.5 ? BigNum.one() : BigNum.zero();
    if (this.e > 16) return new BigNum(this.m, this.e);
    return new BigNum(Math.round(this.toNumber()));
  }

  max(other) {
    const o = BigNum.from(other);
    return this.gte(o) ? this : o;
  }

  min(other) {
    const o = BigNum.from(other);
    return this.lte(o) ? this : o;
  }

  eq(other) {
    const o = BigNum.from(other);
    if (this.m === 0 && o.m === 0) return true;
    return this.e === o.e && Math.abs(this.m - o.m) < 1e-11;
  }

  lt(other) {
    const o = BigNum.from(other);
    if (this.m === 0) return o.m > 0;
    if (o.m === 0) return this.m < 0;
    if (this.m > 0 && o.m < 0) return false;
    if (this.m < 0 && o.m > 0) return true;

    if (this.m > 0) {
      if (this.e !== o.e) return this.e < o.e;
      return this.m < o.m;
    } else {
      if (this.e !== o.e) return this.e > o.e;
      return this.m < o.m;
    }
  }

  lte(other) {
    return this.lt(other) || this.eq(other);
  }

  gt(other) {
    return !this.lte(other);
  }

  gte(other) {
    return !this.lt(other);
  }

  toNumber() {
    if (this.e > 308) return Infinity;
    if (this.e < -308) return 0;
    return this.m * Math.pow(10, this.e);
  }

  // Formatting utilities
  static SUFFIXES = [
    '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
    'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod',
    'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg',
    'Tg', 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Octg', 'Notg',
    'Qag', 'Uqag', 'Dqag', 'Tqag', 'Qaqag', 'Qiqag', 'Sxqag', 'Spqag', 'Ocqag', 'Noqag',
    'Qig', 'Uqig', 'Dqig', 'Tqig', 'Qaqig', 'Qiqig', 'Sxqig', 'Spqig', 'Ocqig', 'Noqig',
    'Sxg', 'Usxg', 'Dsxg', 'Tsxg', 'Qasxg', 'Qisxg', 'Sxsxg', 'Spsxg', 'Ocsxg', 'Nosxg',
    'Spg', 'Uspg', 'Dspg', 'Tspg', 'Qaspg', 'Qispg', 'Sxspg', 'Spspg', 'Ocspg', 'Nospg',
    'Ocg', 'Uocg', 'Docg', 'Tocg', 'Qaocg', 'Qiocg', 'Sxocg', 'Spocg', 'Ococg', 'Noocg',
    'Nog', 'Unog', 'Dnog', 'Tnog', 'Qanog', 'Qinog', 'Sxnog', 'Spnog', 'Ocnog', 'Nonog',
    'Cent', 'Infinity'
  ];

  format(mode = 'standard', precision = 2) {
    if (this.m === 0) return '0';
    if (this.e < 3) {
      const val = this.toNumber();
      return Math.abs(val) < 0.001 ? '0' : val.toLocaleString(undefined, { maximumFractionDigits: precision });
    }

    if (mode === 'scientific' || (mode === 'standard' && this.e >= BigNum.SUFFIXES.length * 3)) {
      return `${this.m.toFixed(precision)}e${this.e}`;
    }

    if (mode === 'engineering') {
      const engExp = Math.floor(this.e / 3) * 3;
      const engMantissa = this.m * Math.pow(10, this.e - engExp);
      return `${engMantissa.toFixed(precision)}e${engExp}`;
    }

    // Standard notation with suffix
    const tier = Math.floor(this.e / 3);
    if (tier < BigNum.SUFFIXES.length) {
      const scaledMantissa = this.m * Math.pow(10, this.e % 3);
      return `${scaledMantissa.toFixed(precision)} ${BigNum.SUFFIXES[tier]}`;
    }

    return `${this.m.toFixed(precision)}e${this.e}`;
  }

  toString() {
    return `${this.m}e${this.e}`;
  }

  toJSON() {
    return { m: this.m, e: this.e };
  }

  static fromJSON(obj) {
    if (!obj) return BigNum.zero();
    return new BigNum(obj.m || 0, obj.e || 0);
  }
}
