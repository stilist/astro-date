;(function () {
  'use strict';

  // shorthand
  var acos = Math.acos,
      cos = Math.cos,
      max = Math.max,
      pow = Math.pow,
      sin = Math.sin,
      tan = Math.tan,

      root = window || this;

  /*-------------------------------------------------------------------------*/

  // minutes (time)
  function getEquationOfTime() {
    var ε = this.getObliquityCorrection(),

        L_0 = this.sun.getMeanLongitude().deg2rad(),
        sin2L_0 = sin(L_0 * 2),
        cos2L_0 = cos(L_0 * 2),
        sin4L_0 = sin(L_0 * 4),

        e = this.getOrbitalEccentricity(),

        M = this.sun.getMeanAnomaly().deg2rad(),
        sinM = sin(M),
        sin2M = sin(M * 2),

        y = pow((tan(ε.deg2rad() / 2)), 2),

        E_time = y * sin2L_0 -
            2 * e * sinM +
            4 * e * y * sinM * cos2L_0 -
            0.5 * pow(y, 2) * sin4L_0 -
            1.25 * pow(e, 2) * sin2M;

    return E_time.rad2deg() * 4;
  }

  // radians
  function getGreenwichMeanSiderialTime() {
    var time_in_secs = this.getSecondOfDayUTC(),
        T = this.getJulianCentury(),
        ε = this.getObliquityCorrection(),
        ψ = this.getNutation();

    var gmst,
        gmst_at_zero = (24110.5484 +
            8640184.812866 * T +
            0.093104 * pow(T, 2) +
            0.0000062 * pow(T, 3)) / 3600;

    gmst_at_zero = gmst_at_zero.clamp(24);

    gmst = gmst_at_zero + (time_in_secs * 1.00273790925) / 3600;
    gmst = gmst + ((ψ / 15) * cos(ε.deg2rad())) / 3600;

    return gmst.clamp(24);
  }

  function getMinuteOfDay() {
    return (this.getHours() * 60) + this.getMinutes() +
        (this.getSeconds() / 60);
  }

  function getMinuteOfDayUTC() {
    return (this.getUTCHours() * 60) + this.getUTCMinutes() +
        (this.getUTCSeconds() / 60);
  }

  function getNonDSTTimezoneOffset() {
    var year = this.getFullYear(),
        jan = new Date(year, 0, 1),
        jul = new Date(year, 6, 1);

    return max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  }

  function getSolarNoon(φ, λ) {
    var jd = this.getJulianDay(),
        tz = -(this.getTimezoneOffset() / 60),
        T_noon = this.getJulianCentury(jd - λ / 360),
        EoT_noon = this.getEquationOfTime(T_noon),
        // minutes (time)
        solar_noon_offset = this.half_day - (λ * 4) - EoT_noon,
        T_next = this.getJulianCentury(jd + solar_noon_offset / this.minutes_in_day),
        next_offset = this.getEquationOfTime(T_next);

    // minutes (time)
    var solar_noon = this.half_day - (λ * 4) - next_offset + (tz * 60);

    if (this.isDST()) {
      solar_noon += 60;
    }
    while (solar_noon < 0) {
      solar_noon += this.minutes_in_day;
    }
    while (solar_noon_offset >= this.minutes_in_day) {
      solar_noon -= this.minutes_in_day;
    }

    return moment(this).startOf('day').add('minutes', solar_noon).toDate();
  }

  function getSolarTransit(rising, φ, λ) {
    if ('undefined' === typeof rising) {
      rising = true;
    }

    var jd = this.getJulianDay(),
        tz = -(this.getTimezoneOffset() / 60),

        UTC = this.getSolarTransitUTC(rising, jd, φ, λ),
        UTC_next = this.getSolarTransitUTC(rising,
            (jd + UTC / this.minutes_in_day), φ, λ);

    var time = UTC_next + (tz * 60);

    if (this.isDST()) {
      time += 60;
    }

    return moment(this).startOf('day').add('minutes', time).toDate();
  }

  function getSolarTransitHourAngle(φ, δ) {
    // 90° (horizon) + 16' (half sun diameter) + 34' (atmospheric refraction)
    var sun_refraction = 90 + ((16 + 34) / 60),
        φ_rad = φ.deg2rad(),
        δ_rad = δ.deg2rad(),
        h_arg = cos(sun_refraction.deg2rad()) / (cos(φ_rad) * cos(δ_rad)) -
            tan(φ_rad) * tan(δ_rad);

    return acos(h_arg);
  }

  // minutes (time)
  function getSolarTransitUTC(rising, jd, φ, λ) {
    if ('undefined' === typeof rising) {
      rising = true;
    }

    var EoT = this.getEquationOfTime(),
        δ = this.getSolarDeclination();

    var h = this.getSolarTransitHourAngle(φ, δ),
        Δ;

    if (!rising) {
      h *= -1;
    }

    Δ = λ + h.rad2deg();

    return this.half_day - (4 * Δ) - EoT;
  }

  function getNextSolarTransit(next, rising, jd, φ, λ) {
    if ('undefined' === typeof next) {
      next = true;
    }

    var dst = this.isDST(),
          tz = -(this.getTimezoneOffset() / 60);

    var mod = next ? 1 : -1,
        transit = this.getSolarTransitUTC(rising, jd, φ, λ),
        timeLocal;

    while (transit.isNaN()) {
      jd += mod;
      transit = this.getSolarTransitUTC(rising, jd, φ, λ);
    }

    timeLocal = transit + tz * 60 + (dst ? 60 : 0);
    while ((timeLocal < 0) || (timeLocal >= this.minutes_in_day)) {
      mod = (timeLocal < 0) ? 1 : -1;
      timeLocal += mod * this.minutes_in_day;
      jd -= mod;
    }

    return jd;
  }

  // http://javascript.about.com/library/bldst.htm
  function isDST() {
    return this.getTimezoneOffset() < this.getNonDSTTimezoneOffset();
  }

  // http://stackoverflow.com/a/8175905
  function isLeapYear() {
    return new Date(this.getFullYear(), 1, 29).getMonth() === 1;
  }

  /*-------------------------------------------------------------------------*/

  function earth(date) {
    if (!date || 'undefined' === typeof date) {
      this.date = new Date();
    } else {
      this.date = date;
    }

    Planet.call(this);

    this.days_in_year = 365.25;
    this.J2000_orbital_eccentricity = 0.01671022;
    this.mass = 5.97219 * pow(10, 24);
    this.mean_days_in_month = 30.6;
    this.mean_motion = 6.2830662287852;
    this.mean_semi_major_axis = 1.00000105726665;
    this.minutes_in_day = 24 * 60;
    this.half_day = this.minutes_in_day / 2;

    this.getEquationOfTime = getEquationOfTime;
    this.getGreenwichMeanSiderialTime = getGreenwichMeanSiderialTime;
    this.getMinuteOfDay = getMinuteOfDay;
    this.getMinuteOfDayUTC = getMinuteOfDayUTC;
    this.getNextSolarTransit = getNextSolarTransit;
    this.getNonDSTTimezoneOffset = getNonDSTTimezoneOffset;
    this.getSolarNoon = getSolarNoon;
    this.getSolarTransit = getSolarTransit;
    this.getSolarTransitHourAngle = getSolarTransitHourAngle;
    this.getSolarTransitUTC = getSolarTransitUTC;
    this.isDST = isDST;
    this.isLeapYear = isLeapYear;
  }
  earth.prototype = Object.create(Planet.prototype);
  earth.prototype.constructor = earth;

  root.Earth = earth;
}.call(this));
