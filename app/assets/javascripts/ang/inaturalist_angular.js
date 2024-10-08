/* eslint-disable */

var iNatAPI = angular.module( "iNatAPI", [ ]);

iNatAPI.factory( "shared", [ "$http", "$rootScope", "$filter",
function( $http, $rootScope, $filter ) {
  var basicGet = function( url, options ) {
    options = options || { };
    if( options.cache !== true ) { options.cache = false; }
    var config = {
      cache: options.cache,
      timeout: 60000 // 60 second timeout
    };
    var apiURL = $( "meta[name='config:inaturalist_api_url']" ).attr( "content" );
    if ( apiURL && url.indexOf( apiURL ) >= 0 ) {
      var apiToken = $( "meta[name='inaturalist-api-token']" ).attr( "content" );
      if ( apiToken ) {
        config.headers = {
          Authorization: apiToken
        }
      }
    }
    return $http.get( url, config ).then(
      function( response ) {
        return response;
      }, function( errorResponse ) {
        // Handle error case
        if ( errorResponse && errorResponse.data && errorResponse.data.error ) {
          if ( errorResponse.data.error.match( /window is too large/ ) ) {
            alert( I18n.t( "result_window_too_large_error" ).replace( /\s+/g, " " ) );
          } else {
            alert( errorResponse.data.error );
          }
        } else if ( errorResponse && errorResponse.status && errorResponse.status > 0 ) {
          alert( I18n.t( "doh_something_went_wrong" ) );
        } else {
          // Unfortunately Firefox will fire the error callback when a promise
          // gets cancelled, say due to a page reload, so we should not show
          // an error here or people will see it when they reload the page or
          // navigate to a different page while a request is in flight. Even
          // more unfortunately, Firefox does exactly the same thing when the
          // connection fails, e.g. the API is down.
        }
      }
    );
  };

  var numberWithCommas = function( num ) {
    if( !_.isNumber( num ) ) { return num; }
    return I18n.toNumber( num, { precision: 0 } );
  };

  var t = function( k, options ) {
    options = options || { };
    return I18n.t( k, options );
  };

  var l = function( format, value ) {
    return I18n.l( format, moment( value ) );
  };

  var pluralWithoutCount = function( key, count ) {
    var s = I18n.t( key, { count: count } );
    s = s.replace( /\<span.*?\>.+?\<\/span\>/g, "" );
    s = s.replace( count, "" );
    return s;
  }

  var taxonStatusTitle = function( taxon ) {
    if( !taxon.conservation_status ) { return; }
    var title = $filter( "capitalize" )( taxon.conservationStatus( ), "title" );
    if( taxon.conservation_status && taxon.conservation_status.place ) {
      title = t( "status_in_place", {
        status: title, place: taxon.conservation_status.place.display_name });
    } else {
      title = t( "status_globally", { status: title });
    }
    return title;
  };

  var taxonMeansTitle = function( taxon ) {
    if( !taxon.establishment_means ) { return; }
    var title = $filter( "capitalize" )(
      t( taxon.establishment_means.establishment_means ), "title" );
    if( taxon.establishment_means && taxon.establishment_means.place ) {
      title = t( "status_in_place", {
        status: $filter( "capitalize" )(
          t( taxon.establishment_means.establishment_means, { locale: "en" }), "title" ),
        place: taxon.establishment_means.place.display_name });
    }
    return title;
  };

  var backgroundIf = function( url ) {
    if( url ) {
      return { "background-image": "url('" + url + "')" };
    }
  };

  var offsetCenter = function( options, callback ) {
    if( !options.map ) { return callback( ); }
    if ( typeof ( google ) === "undefined" ) { return callback( ); }
    var overlay = new google.maps.OverlayView( );
    overlay.draw = function( ) { };
    overlay.onAdd = function( ) { };
    overlay.onRemove = function( ) { };
    overlay.setMap( options.map );
    var proj = overlay.getProjection( );
    var currentCenter = options.map.getCenter( );
    if( !proj ) {
      options.attempts = options.attempts || 0;
      options.attempts += 1;
      if( options.attempts >= 10 ) { return callback( currentCenter ); }
      setTimeout( function( ) {
        offsetCenter( options, callback );
      }, 5);
      return;
    }
    var cPoint = proj.fromLatLngToDivPixel( currentCenter );
    cPoint.x = cPoint.x + options.left; // left of center
    cPoint.y = cPoint.y + options.up; // north of center
    var newCenter = proj.fromDivPixelToLatLng( cPoint );
    overlay.setMap( null );
    overlay = null;
    callback( newCenter );
  };

  var processPoints = function( geometry, callback, thisArg ) {
    if( !geometry ) { return; }
    if ( typeof ( google ) === "undefined" ) { return callback( ); }
    if( geometry instanceof google.maps.LatLng ) {
      callback.call( thisArg, geometry );
    } else if( geometry instanceof google.maps.Data.Point ) {
      callback.call( thisArg, geometry.get( ) );
    } else {
      geometry.getArray( ).forEach( function( g ) {
        processPoints( g, callback, thisArg );
      });
    }
  };

  var stringStartsWith = function( str, pattern, position ) {
    position = _.isNumber( position ) ? position : 0;
    // We use `lastIndexOf` instead of `indexOf` to avoid tying execution
    // time to string length when string doesn't start with pattern.
    return str.toLowerCase( ).lastIndexOf( pattern.toLowerCase( ), position ) === position;
  };

  var pp = function( obj ) {
    console.log( JSON.stringify( obj, null, "  " ) );
  };

  return {
    basicGet: basicGet,
    numberWithCommas: numberWithCommas,
    t: t,
    l: l,
    pluralWithoutCount: pluralWithoutCount,
    taxonStatusTitle: taxonStatusTitle,
    taxonMeansTitle: taxonMeansTitle,
    backgroundIf: backgroundIf,
    offsetCenter: offsetCenter,
    processPoints: processPoints,
    stringStartsWith: stringStartsWith,
    pp: pp
  }
}]);

// prints a date like "Today 12:34 PM" with some stylable wrapper elements
iNatAPI.directive('inatCalendarDate', ["shared", function(shared) {
  function displayTimezone( useViewersTimezone, defaultTimezone ) {
    if ( useViewersTimezone ) {
      var guessedTimezone = moment.tz.guess( );
      // confirm that what moment.tz.guess( ) returns is a timezone known by momentjs
      if ( moment.tz.names( ).includes( guessedTimezone ) ) {
        return guessedTimezone;
      }
    }
    return defaultTimezone || "UTC";
  }

  return {
    scope: {
      time: "=",
      date: "=",
      timezone: "=",
      obscured: "=",
      short: "=",
      viewersTimezone: "="
    },
    link: function(scope, elt, attr) {
      scope.dateString = function() {
        if( !scope.date ) {
          return shared.t( "missing_date" );
        }
        if ( scope.obscured ) {
           return moment(scope.date).format(
             scope.short
               ? I18n.t( "momentjs.month_year_short" )
               : I18n.t( "momentjs.month_year" )
           );
        }
        var timezone = displayTimezone( scope.viewersTimezone, scope.timezone );
        var date = moment.tz( scope.time || scope.date, timezone ),
            now = moment(new Date()),
            dateString;
        if (date.isSame(now, 'day')) {
          dateString = I18n.t('today');
        } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
          dateString = I18n.t('yesterday');
        } else {
          dateString = date.format('ll');
        }
        return dateString;
      }
      scope.timeString = function() {
        if ( !scope.time ) return "";
        if ( scope.obscured ) return "";
        var timezone = displayTimezone( scope.viewersTimezone, scope.timezone );
        var d = moment.tz( scope.time, timezone );
        // For some time zones, moment cannot output something nice like PDT and
        // instead does something like -08. In this situations, we print a full offset
        // like -08:00 instead
        if ( parseInt( d.format( "z" ), 10 ) && parseInt( d.format( "z" ), 10 ) !== 0 ) {
          return d.format( "LT Z" );
        }
        return d.format( "LT z" );
      }
      scope.titleText = function() {
        if ( !scope.time ) {
          return null;
        }
        var timezone = displayTimezone( scope.viewersTimezone, scope.timezone );
        var momentTime = moment.tz( scope.time, timezone );
        if ( scope.obscured ) {
          return momentTime.format( I18n.t( "momentjs.month_year" ) );
        } else {
          return momentTime.format( );
        }
      }
    },
    template: '<span class="date">{{ dateString() }}</span>'
      + '<span class="time" title="{{ titleText() }}">{{ timeString() }}</span>'
  }
}]);

// print a taxon with correctly formatted common and scientific names
iNatAPI.directive('inatTaxon', ["shared", function(shared) {
  return {
    scope: {
      taxon: '=',
      url: '@'
    },
    link: function(scope, elt, attr) {
      scope.iconicTaxonNameForID = function(iconicTaxonID) {
        var t = window.ICONIC_TAXA[iconicTaxonID]
        if (t) {
          return t.name;
        } else {
          return 'Unknown'
        }
      };
      scope.shared = shared;
      scope.user = CURRENT_USER;
      scope.displayNames = function() {
        var names = [];
        if ( !scope.taxon ) { return; }
        if ( scope.user && scope.user.prefers_scientific_name_first ) {
          names.push( scope.taxon.name );
        } else if ( !_.isEmpty( scope.taxon.preferred_common_names ) ) {
          names = _.map( scope.taxon.preferred_common_names, function( taxonName ) {
            return iNatModels.Taxon.titleCaseName( taxonName.name )
          } );
        } else if ( scope.taxon.preferred_common_name ) {
          names.push( iNatModels.Taxon.titleCaseName( scope.taxon.preferred_common_name ) );
        } else {
          names.push( scope.taxon.name );
        }
        return _.uniq( names );
      }
      scope.secondaryNames = function() {
        var names = [];
        if ( !scope.taxon ) { return; }
        if ( scope.user && scope.user.prefers_scientific_name_first ) {
          if ( !_.isEmpty( scope.taxon.preferred_common_names ) ) {
            names = _.map( scope.taxon.preferred_common_names, function( taxonName ) {
              return iNatModels.Taxon.titleCaseName( taxonName.name )
            } );
          } else if ( scope.taxon.preferred_common_name ) {
            names.push( iNatModels.Taxon.titleCaseName( scope.taxon.preferred_common_name ) );
          }
        } else if ( scope.taxon.preferred_common_name ) {
          names.push( scope.taxon.name );
        }
        return _.uniq( names );
      }
      scope.showRank = function() {
        return scope.taxon && scope.taxon.rank_level > 10;
      }
      scope.rank = function() {
        if ( !scope.taxon || !scope.taxon.rank ) { return; }
        return I18n.t( "ranks."+scope.taxon.rank.toLowerCase( ), { defaultValue: scope.taxon.rank } );
      }
    },
    templateUrl: 'ang/templates/shared/taxon.html'
  }
}]);

iNatAPI.directive( "observationSnippet", [ "shared", function( shared ) {
  return {
    scope: { o: "=" },
    link: function( scope ) {
      scope.shared = shared;
    },
    templateUrl: "ang/templates/shared/observation.html"
  };
}]);

iNatAPI.directive( "userIcon", [ "shared", function( shared ) {
  return {
    scope: { u: "=" },
    link: function( scope ) {
      scope.shared = shared;
    },
    templateUrl: "ang/templates/shared/user_icon.html"
  };
}]);

iNatAPI.directive( "userLogin", [ function( ) {
  return {
    scope: { u: "=" },
    templateUrl: "ang/templates/shared/user_login.html"
  };
}]);
