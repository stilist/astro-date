;(function () {
  'use strict';

  // shorthand
  var julian_year = 365.25 * 100,

      pow = Math.pow,

      root = window || this,

      date_methods = ['getDate', 'getDay', 'getFullYear', 'getHours',
          'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime',
          'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear',
          'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth',
          'getUTCSeconds', 'getYear', 'setDate', 'setFullYear', 'setHours',
          'setMilliseconds', 'setMinutes', 'setMonth', 'setSeconds', 'setTime',
          'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds',
          'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds', 'setYear',
          'toDateString', 'toGMTString', 'toISOString', 'toJSON',
          'toLocaleDateString', 'toLocaleFormat', 'toLocaleString',
          'toLocaleTimeString', 'toSource', 'toString', 'toTimeString',
          'toUTCString', 'valueOf'];

  /*-------------------------------------------------------------------------*/

  function floor(n) {
    return ~~n;
  }

  // Julian centuries since J2000
  function getJulianCentury(day) {
    if ('undefined' === typeof day) {
      day = this.getJulianDay();
    }

    return (day - this.J2000) / julian_year;
  }

  // TODO calculate distance
  function getAttractiveForce(mass2, distance) {
    if (!mass2 || Number !== typeof mass2) {
      return 0;
    }
    if (!distance || Number !== typeof distance) {
      return 0;
    }

    var G = this.gravitational_constant;

    return G * ((this.mass * mass2) / pow(distance, 2));
  }

  // μ: gravitational constant (G) * mass of body
  //
  // km³s⁻²
  function getGM() {
    var G = this.gravitational_constant;

    return G * this.mass;
  }

  // Julian day from Gregorian calendar
  function getJulianDay() {
    var day = this.getDate(),
        month = this.getMonth() + 1,
        year = this.getFullYear(),

        a = floor((14 - month) / 12),
        y = year + 4800 - a,
        m = month + (12 * a) - 3;

    return day + floor((153 * m + 2) / 5) + (365 * y) +
        floor(y / 4) - floor(y / 100) + floor(y / 400) - 32045.5;
  }

  function isDST() {
    return false;
  }

  function isLeapYear() {
    return false;
  }

  /*-------------------------------------------------------------------------*/

  function astro_date() {
    if (!this.date || 'undefined' === typeof this.date) {
      this.date = new Date();
    }

    // N⋅(m/kg)²
    this.gravitational_constant = 6.673 * pow(10, -11);
    this.J2000 = 2451545;

    // override these in derived objects
    // kg
    this.mass = 0;

    this.getAttractiveForce = getAttractiveForce;
    this.getGM = getGM;
    this.getJulianCentury = getJulianCentury;
    this.getJulianDay = getJulianDay;
    this.isLeapYear = isLeapYear;
    this.isDST = isDST;

    // alias `Date` methods because it can’t be subclassed
    var num_methods = date_methods.length,
        method_name;
    for (var i=0; i < num_methods; i++) {
      method_name = date_methods[i];

      this[method_name] = (function (name) {
        return function () { return this.date[name]() };
      })(method_name);
    }
  }

  root.AstroDate = astro_date;
}.call(this));
