$(document).foundation();



(function($) {
	$(document).ready(function(){
		$('.testimonial-slider').slick({
		    infinite: true,
		    arrows: false,
		    dots: true,
		    slidesToShow: 1,
		    autoplay: true,
		    //appendArrows: $('.projects-preview-arrows'),
		    fade: true,
            pauseOnFocus: false,
            pauseOnHover: false,
		  });
	});

	$('#offCanvas').on('opened.zf.offCanvas', function() {
	  $('.hamburger').addClass('is-active');
	});

	$('#offCanvas').on('close.zf.offCanvas', function() {
	  $('.hamburger').removeClass('is-active');
	});

   	var wow = new WOW(
      {
        //mobile: false
    	}
    )
    wow.init();


	$(window).on('scroll',function(){
		var scrollTop = $(this).scrollTop();

		if(scrollTop >= 150  && !$('header.header>.header-inner').hasClass('scrolled-header')) {
			$('header.header>.header-inner').addClass('scrolled-header');
            //$(this).scrollTop(151);

		}

		else if(scrollTop <= 149 && $('header.header>.header-inner').hasClass('scrolled-header')) {
			$('header.header>.header-inner').removeClass('scrolled-header');
            //$(this).scrollTop(148);

		}
	});


//open and close search menu
$('button.search-toggle').on("click", function (event) {
    event.preventDefault();
    $('body').toggleClass('search-open');
    event.stopPropagation();
});

$(document).bind('keydown', function(e) {
	//alert(e.which);
    if (e.which == 27) {
        $('body').removeClass('search-open');
    }
}); 

/**
 * initMap
 *
 * Renders a Google Map onto the selected jQuery element
 *
 * @date    22/10/19
 * @since   5.8.6
 *
 * @param   jQuery $el The jQuery element.
 * @return  object The map instance.
 */
function initMap( $el ) {

    // Find marker elements within map.
    var $markers = $el.find('.marker');

    // Create gerenic map.
    var mapArgs = {
        zoom        : $el.data('zoom') || 16,
        mapTypeId   : google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map( $el[0], mapArgs );

    // Add markers.
    map.markers = [];
    $markers.each(function(){
        initMarker( $(this), map );
    });

    // Center map based on markers.
    centerMap( map );

    // Return map instance.
    return map;
}

/**
 * initMarker
 *
 * Creates a marker for the given jQuery element and map.
 *
 * @date    22/10/19
 * @since   5.8.6
 *
 * @param   jQuery $el The jQuery element.
 * @param   object The map instance.
 * @return  object The marker instance.
 */
function initMarker( $marker, map ) {

    // Get position from marker.
    var lat = $marker.data('lat');
    var lng = $marker.data('lng');
    var latLng = {
        lat: parseFloat( lat ),
        lng: parseFloat( lng )
    };

    // Create marker instance.
    var marker = new google.maps.Marker({
        position : latLng,
        map: map
    });

    // Append to reference for later use.
    map.markers.push( marker );

    // If marker contains HTML, add it to an infoWindow.
    if( $marker.html() ){

        // Create info window.
        var infowindow = new google.maps.InfoWindow({
            content: $marker.html()
        });

        // Show info window when marker is clicked.
        google.maps.event.addListener(marker, 'click', function() {
            infowindow.open( map, marker );
        });
    }
}

/**
 * centerMap
 *
 * Centers the map showing all markers in view.
 *
 * @date    22/10/19
 * @since   5.8.6
 *
 * @param   object The map instance.
 * @return  void
 */
function centerMap( map ) {

    // Create map boundaries from all map markers.
    var bounds = new google.maps.LatLngBounds();
    map.markers.forEach(function( marker ){
        bounds.extend({
            lat: marker.position.lat(),
            lng: marker.position.lng()
        });
    });

    // Case: Single marker.
    if( map.markers.length == 1 ){
        map.setCenter( bounds.getCenter() );

    // Case: Multiple markers.
    } else{
        map.fitBounds( bounds );
    }
}

// Render maps on page load.
$(document).ready(function(){
    $('.acf-map').each(function(){
        var map = initMap( $(this) );
    });
});


    $(window).on('load',function() {        
        // Animate loader off screen
        $("#loader").fadeOut(100);
    });

//animate all anchor links

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth',
            block: "nearest", 
        });
    });
});
})( jQuery );