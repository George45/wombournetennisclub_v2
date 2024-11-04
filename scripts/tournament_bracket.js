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
    ]
}).on('beforeChange', function() {
    $('.carousel-data').removeClass('bracket-height-fix');
}).on('afterChange', function() {
    multiSlideHeightFix(this);
});

function multiSlideHeightFix(slider) {
    let tallest = 0;

    setTimeout(function() {
        $('.slick-track .slick-active', slider).each(function() {
            let height = $(this).outerHeight();

            if (height > tallest) {
                tallest = height;
            }
        });

        $('.slick-list', slider).height(tallest);
    }, 10);

    setTimeout(function() {
        $('.carousel-data').addClass('bracket-height-fix');
    }, 10);
}

$(window).on('resize', function() {
    multiSlideHeightFix(bracketSlider);
});