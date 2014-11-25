;(function () {
  'use strict';

  var pow = Math.pow,
      sin = Math.sin,

      root = window || this;

  /*-------------------------------------------------------------------------*/

  // degrees
  function getApparentLongitude() {
    var T = this.getJulianCentury(),
        o = this.getTrueLongitude(),
        // unsourced magic numbers
        Ω = 125.04452 - 1934.136261 * T;

    // unsourced magic numbers
    return o - 0.00569 - (17.20 / 3600) * sin(Ω.deg2rad());
  }

  // degrees
  function getEquationOfTheCenter() {
    var M = this.getMeanAnomaly(),
        M_rad = M.deg2rad(),
        sinM = sin(M_rad),
        sin2M = sin(M_rad * 2),
        sin3M = sin(M_rad * 3),
        T = this.getJulianCentury();

    // unsourced magic numbers
    return sinM * (1.914602 - T * (0.004817 + 0.000014 * T)) +
        sin2M * (0.019993 - 0.000101 * T) +
        sin3M * 0.000289;
  }

  // degrees
  function getMeanAnomaly() {
    var M = 357.52911,
        T = this.getJulianCentury();

    // correcting for aberration of light
    return M + (35999.05029 * T) - (0.0001537 * pow(T, 2));
  }

  // degrees
  function getMeanLongitude() {
    var L_0 = 280.46645,
        T = this.getJulianCentury(),

        // aberration of light
        corrected = L_0 + (36000.76983 * T) + (0.0003032 * pow(T, 2));

    return corrected.clamp(360);
  }

  // degrees
  function getTrueAnomaly() {
    var c = this.getEquationOfTheCenter(),
        M = this.getMeanAnomaly();

    return M + c;
  }

  // degrees
  function getTrueLongitude() {
    var c = this.getEquationOfTheCenter(),
        L_0 = this.getMeanLongitude();

    return L_0 + c;
  }

  /*-------------------------------------------------------------------------*/

  function sun(date) {
    if (!date || 'undefined' === typeof date) {
      this.date = new Date();
    } else {
      this.date = date;
    }

    AstroDate.call(this);

    this.getApparentLongitude = getApparentLongitude;
    this.getEquationOfTheCenter = getEquationOfTheCenter;
    this.getMeanAnomaly = getMeanAnomaly;
    this.getMeanLongitude = getMeanLongitude;
    this.getTrueAnomaly = getTrueAnomaly;
    this.getTrueLongitude = getTrueLongitude;
  }
  sun.prototype = Object.create(AstroDate.prototype);
  sun.prototype.constructor = sun;

  root.Sun = sun;
}.call(this));
