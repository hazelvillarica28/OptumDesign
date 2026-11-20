$(function () {
    var BASE_W = 1920, BASE_H = 1280;
    var MIN_H = 1150; 
    var $stage = $("#stage");

    var $layers = $(".layer");

    function fit() {
        var w = window.innerWidth, h = window.innerHeight;
        var scale = Math.min(w / BASE_W, h / MIN_H);
        var stageW = w / scale, stageH = h / scale;
        var extraX = stageW - BASE_W, extraY = stageH - BASE_H;

        $stage.css({ "--scale": scale, width: stageW + "px", height: stageH + "px" });
        $layers.each(function () {
            var $l = $(this);
            var x = extraX * parseFloat($l.data("x")), y = extraY * parseFloat($l.data("y"));
            $l.css("transform", "translate(" + x + "px," + y + "px)");
        });
    }
    fit();
    $(window).on("resize", fit);

    // Entrance animation
    var $items = $(".logo, .nav, .header-divider, .hero > *, .pillars, .foot-left, .foot-right, .node, .label");
    $items.addClass("reveal");
    $items.each(function (i) {
        var $el = $(this);
        setTimeout(function () { $el.addClass("in"); }, 80 + i * 45);
    });
    setTimeout(function () { $items.removeClass("reveal in"); }, 80 + $items.length * 45 + 900);



    // Highlight the matching label when hovering a node
    //$(".node").each(function () {
    //    var $node = $(this);
    //    var $label = $node.next(".label");
    //    $node.on("mouseenter", function () { $label.addClass("is-hover"); })
    //        .on("mouseleave", function () { $label.removeClass("is-hover"); })
    //        .on("click", function (e) { e.preventDefault(); });
    //});

    // Highlight the matching label when hovering a node
    $(".node").each(function () {
        var $node = $(this);
        var $label = $node.next(".label");

        $node.on("mouseenter", function () { $label.addClass("is-hover"); })
            .on("mouseleave", function () { $label.removeClass("is-hover"); })
            .on("click", function (e) {
                // Only block placeholder links (href="#")
                var href = ($node.attr("href") || "").trim();
                if (href === "#") {
                    e.preventDefault();
                }
            });
    });

    // Cycle through the pillars
    var $pillars = $(".pillars li"), p = 0;
    setInterval(function () {
        $pillars.removeClass("is-on").eq(p % $pillars.length).addClass("is-on");
        p++;
    }, 1800);

});
