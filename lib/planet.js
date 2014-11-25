;(function () {
  'use strict';

  // shorthand
  var abs = Math.abs,
      acos = Math.acos,
      asin = Math.asin,
      atan2 = Math.atan2,
      cos = Math.cos,
      pow = Math.pow,
      sin = Math.sin,
      tan = Math.tan,

      root = window || this;

  function arc2deg(degrees, minutes, seconds) {
    return degrees + (minutes / 60) + (seconds / 60 / 60);
  }

  function floor(n) {
    return ~~n;
  }

  /*-------------------------------------------------------------------------*/

  function getAntipode (φ, λ) {
    return [φ + 180, -λ];
  }

  function getAzimuthAndElevation (φ, λ) {
    var φ_rad = φ.deg2rad(),

        EoT = this.getEquationOfTime(),
        δ = this.getSolarDeclination(),
        δ_rad = δ.deg2rad(),
        tz = -this.getTimezoneOffset(),

        corrected_solar_time = EoT + 4 * λ - tz;

    var true_solar_time = this.getMinuteOfDay() + corrected_solar_time,
        h = true_solar_time / 4 - 180,

        csz,
        refraction_correction,
        α,
        α_denominator,
        α_output,
        α_rad,
        α_s,
        γ_output,
        ζ,
        ζ_rad,
        ζ_s;

    while (true_solar_time > this.minutes_in_day) {
      true_solar_time -= this.minutes_in_day;
    }

    if (h < -180) {
      h += 360;
    }

    csz = sin(φ_rad) * sin(δ_rad) + cos(φ_rad) * cos(δ_rad) *
        cos(h.deg2rad());
    if (csz > 1) {
      csz = 1;
    } else if (csz < -1) {
      csz = -1;
    }

    ζ_rad = acos(csz);
    ζ = ζ_rad.rad2deg();
    α_denominator = cos(φ_rad) * sin(ζ_rad);

    if (abs(α_denominator) > 0.001) {
      α_rad = ((sin(φ_rad) * cos(ζ_rad)) - sin(δ_rad)) / α_denominator;

      if (abs(α_rad) > 1) {
        α_rad = (α_rad < 0) ? -1 : 1;
      }

      α = 180 - acos(α_rad).rad2deg();
      if (h > 0) {
        α *= -1;
      }
    } else {
      α = (φ > 0) ? 180 : 0;
    }

    if (α < 0) {
      α += 360;
    }

    α_s = 90 - ζ;
    refraction_correction = this.getRefractionCorrection(α_s);
    ζ_s = ζ - refraction_correction;

    α_output = floor(α * 100 + 0.5) / 100;
    γ_output = floor((90 - ζ_s) * 100 + 0.5) / 100;

    return [α_output, γ_output];
  }

  function getDayOfYearFromJulianDate(jd) {
    var z = floor(jd + 0.5),
        f = (jd + 0.5) - z;

    var α,
        A,
        B,
        C,
        D,
        E,
        day,
        month,
        year,
        k;

    if (z < 2299161) {
      A = z;
    } else {
      α = floor((z - 1867216.25) / 36524.25);
      A = z + 1 + α - floor(α / 4);
    }

    B = A + 1524;
    C = floor((B - 122.1) / this.days_in_year);
    D = floor(this.days_in_year * C);
    E = floor((B - D) / this.mean_days_in_month);
    day = B - D - floor(this.mean_days_in_month * E) + f;
    month = (E < 14) ? E - 1 : E - 13;
    year = (month > 2) ? C - 4716 : C - 4715;

    k = this.isLeapYear(year) ? 1 : 2;
    return floor((275 * month) / 9) - k * floor((month + 9) / 12) + day - 30;
  }

  // Julian centuries since (J2000)
  function getJulianCentury(day) {
    if ('undefined' === typeof day) {
      day = this.getJulianDay();
    }

    return (day - this.J2000) / julian_year;
  }

  // per Astronomical Almanac 2010
  // degrees
  function getMeanObliquityOfEcliptic() {
    var T = this.getJulianCentury();

    // magic numbers accurate for J2000
    return arc2deg(23, 26, 21.406) -
        // drift
        arc2deg(0, 0, 46.836769) * T -
        arc2deg(0, 0, 0.0001831) * pow(T, 2) -
        arc2deg(0, 0, 0.00200340) * pow(T, 3) -
        arc2deg(0, 0, 0.576e-6) * pow(T, 4) -
        arc2deg(0, 0, 4.34e-8) * pow(T, 5);
  }

  function getNutation() {
    var T = this.getJulianCentury(),
        ε = this.getObliquityCorrection(),
        L_0 = this.sun.getMeanLongitude(),
        // unsourced magic numbers
        L_m = 218.3165 + 481267.8813 * T;

    // unsourced magic numbers
    return -17.20 * sin(ε.deg2rad()) -
        -1.32 * sin(2 * L_0.deg2rad()) -
        0.23 * sin(2 * L_m.deg2rad()) +
        0.21 * sin(2 * ε.deg2rad());
  }

  // degrees
  function getObliquityCorrection() {
    var ε_0 = this.getMeanObliquityOfEcliptic(),

        T = this.getJulianCentury(),
        // unsourced magic numbers
        Ω = 125.04452 - 1934.136261 * T;

    // unsourced magic number
    return ε_0 + 0.00256 * cos(Ω.deg2rad());
  }

  function getOrbitalEccentricity() {
    var T = this.getJulianCentury();

    // unsourced magic numbers
    return this.J2000_orbital_eccentricity -
        (0.000042037 * T) +
        (0.0000001267 * pow(T, 2));
  }

  // distance from solar center to earth center in AU
  function getRadiusVector() {
    var anomaly = this.sun.getTrueAnomaly(),
        e = this.getOrbitalEccentricity();

    return this.mean_semi_major_axis * (1 - pow(e, 2)) /
        (1 + e * cos(anomaly.deg2rad()));
  }

  // lots of unsourced magic numbers
  function getRefractionCorrection(elevation) {
    if (elevation > 85) {
      return 0;
    } else {
      var tan_elevation = tan(elevation.deg2rad());

      var correction;

      if (elevation > 5) {
        correction = 58.1 / tan_elevation -
            0.07 / pow(tan_elevation, 3) +
            0.000086 / pow(tan_elevation, 5);
      } else if (elevation > -0.575) {
        correction = 1735 +
            -518.2 * elevation +
            103.4 * pow(elevation, 2) +
            -12.79 * pow(elevation, 3) +
            0.711 * pow(elevation, 4);
      } else {
        correction = -20.774 / tan_elevation;
      }

      return correction / 3600;
    }
  }

  // degrees
  function getRightAscension() {
    var ε = this.getObliquityCorrection(),
        λ = this.sun.getApparentLongitude();

    return atan2(cos(ε.deg2rad()) * sin(λ.deg2rad()), cos(λ.deg2rad()));
  }

  function getSecondOfDay() {
    return this.getMinuteOfDay() * 60;
  }

  function getSecondOfDayUTC() {
    return this.getMinuteOfDayUTC() * 60;
  }

  // degrees
  function getSolarPosition() {
    return {
      ra: this.getRightAscension().rad2deg().clamp(360) / 15,
      dec: this.getSolarDeclination()
    };
  }

  function getSolarDeclination() {
    var ε = this.getObliquityCorrection().deg2rad(),
        λ = this.sun.getApparentLongitude().deg2rad(),
        sinT = sin(ε) * sin(λ);

    return asin(sinT).rad2deg();
  }

  function getTerminatorArc(start_lng, end_lng, reverse) {
    var gmst = this.getGreenwichMeanSiderialTime(),
        sun_pos = this.getSolarPosition();

    var lats = [],
        lngs = [],
        sun_long = -(gmst * 15 - sun_pos.ra * 15);
    // gives wrong result if done directly on above line
    sun_long = sun_long.clamp(360);

    for (var i=start_lng; i <= end_lng; i++) {
      var Δ_lat = Math.asin(Math.cos(sun_pos.dec.deg2rad()) *
          Math.sin(i.deg2rad())).rad2deg();

      if (Math.abs(Δ_lat) < 85) {
        var x = -Math.cos(sun_long.deg2rad()) *
                  Math.sin(sun_pos.dec.deg2rad()) *
                  Math.sin(i.deg2rad()) -
                  Math.sin(sun_long.deg2rad()) *
                  Math.cos(i.deg2rad()),
              y = -Math.sin(sun_long.deg2rad()) *
                  Math.sin(sun_pos.dec.deg2rad()) *
                  Math.sin(i.deg2rad()) +
                  Math.cos(sun_long.deg2rad()) *
                  Math.cos(i.deg2rad()),
              Δ_lng = Math.atan2(y, x).rad2deg().clamp(360);

        lats.push(Δ_lat);
        lngs.push(Δ_lng);
      }
    }

    if (reverse) {
      lats = lats.reverse();
      lngs = lngs.reverse();
    }

    return {
      lats: lats,
      lngs: lngs
    };
  }

  function getTerminatorCoordinates() {
    var sun_pos = this.getSolarPosition();

    var arc,
        east_lats = [],
        east_lngs = [],
        polar_night,
        west_lats = [],
        west_lngs = [];

    if (sun_pos.dec > 5) {
      polar_night = 'south';
    } else if (sun_pos.dec < -5) {
      polar_night = 'north';
    }

    arc = this.getTerminatorArc(0, 90, true);
    east_lats = east_lats.concat(arc.lats);
    east_lngs = east_lngs.concat(arc.lngs);

    arc = this.getTerminatorArc(90, 270, false);
    west_lats = west_lats.concat(arc.lats);
    west_lngs = west_lngs.concat(arc.lngs);

    arc = this.getTerminatorArc(270, 360, true);
    east_lats = east_lats.concat(arc.lats);
    east_lngs = east_lngs.concat(arc.lngs);

    if (sun_pos.dec < 0) {
      west_lats.reverse();
      west_lngs.reverse();
    } else if (sun_pos.dec > 0) {
      east_lats.reverse();
      east_lngs.reverse();
    }

    return {
      lats: east_lats.concat(west_lats),
      lngs: east_lngs.concat(west_lngs),
      polar_night: polar_night
    };
  }

  /*-------------------------------------------------------------------------*/

  function planet(date) {
    if (!date || 'undefined' === typeof date) {
      this.date = new Date();
    } else {
      this.date = date;
    }
    this.sun = new Sun(this.date);

    AstroDate.call(this);

    // override these in derived objects
    this.days_in_year = 0;
    this.J2000_orbital_eccentricity = 0;
    this.julian_year = this.days_in_year * 100;
    this.mean_days_in_month = 0;
    this.mean_motion = 0;
    this.mean_semi_major_axis = 0;
    this.minutes_in_day = 0;

    this.getAntipode = getAntipode;
    this.getAzimuthAndElevation = getAzimuthAndElevation;
    this.getDayOfYearFromJulianDate = getDayOfYearFromJulianDate;
    this.getMeanObliquityOfEcliptic = getMeanObliquityOfEcliptic;
    this.getNutation = getNutation;
    this.getObliquityCorrection = getObliquityCorrection;
    this.getOrbitalEccentricity = getOrbitalEccentricity;
    this.getRadiusVector = getRadiusVector;
    this.getRefractionCorrection = getRefractionCorrection;
    this.getRightAscension = getRightAscension;
    this.getSecondOfDay = getSecondOfDay;
    this.getSecondOfDayUTC = getSecondOfDayUTC;
    this.getSolarDeclination = getSolarDeclination;
    this.getSolarPosition = getSolarPosition;
    this.getTerminatorArc = getTerminatorArc;
    this.getTerminatorCoordinates = getTerminatorCoordinates;
  }
  planet.prototype = Object.create(AstroDate.prototype);
  planet.prototype.constructor = planet;

  root.Planet = planet;
}.call(this));
