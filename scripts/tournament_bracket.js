const bracketSlider = $('.carousel-data').on('init', function() {
    multiSlideHeightFix(this);
}).slick({
    infinite: false,
    prevArrow: $('.carousel-prev'),
    nextArrow: $('.carousel-next'),
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
        {breakpoint: 992, settings: {slidesToShow: 2, slidesToScroll: 1}},
        {breakpoint: 768, settings: {slidesToShow: 1, slidesToScroll: 1}}
    ],
}).on('beforeChange', function() {
    $('.carousel-data').removeClass('bracket-height-fix');
}).on('afterChange', function() {
    multiSlideHeightFix(this);
});

function multiSlideHeightFix(slider) {
    setTimeout(function() {
        $('.slick-list', slider).height($('.slick-track .slick-active', slider).outerHeight());
        $('.carousel-data').addClass('bracket-height-fix');
    }, 10);
}

$(window).on('resize', function() {
    multiSlideHeightFix(bracketSlider);
});