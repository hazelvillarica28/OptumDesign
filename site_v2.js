$(document).ready(() => attach_common_events());

function attach_common_events() {

    const FILTERS = {
        capability: "",
        business: "",
        geo: "",
        priority: "",
        stage: ""
    };

    const TIME_FILTER = {
        type: "all",
        year: "",
        start: "",
        end: ""
    };

    const DEFAULT_PIPELINE_WEIGHTS = {
        inApproval: 10,
        approvedNoOwner: 25,
        approvedWithPlan: 50,
        inImplementation: 75,
        implementedNotValidated: 90,
        validated: 100
    };

    let PIPELINE_WEIGHTS = { ...DEFAULT_PIPELINE_WEIGHTS };

    const AttachForecastModalEvents = () => {
        const $modal = $("#forecastModal");
        if (!$modal.length) return;

        const openModal = () => {
            $modal.addClass("open").attr("aria-hidden", "false");
        };

        const closeModal = () => {
            $modal.removeClass("open").attr("aria-hidden", "true");
        };

        const syncLabels = () => {
            $("#forecastFields input[type='range']").each(function () {
                const key = $(this).data("weight");
                const v = Number($(this).val() || 0);
                $(`#wv-${key}`).text(`${v}%`);
            });
        };

        const setFormValues = (weights) => {
            $("#forecastFields input[type='range']").each(function () {
                const key = $(this).data("weight");
                const v = Number(weights[key] ?? 0);
                $(this).val(v);
            });
            syncLabels();
        };

        $("#forecastBtn")
            .off("click.commonForecast")
            .on("click.commonForecast", function () {
                setFormValues(PIPELINE_WEIGHTS);
                openModal();
            });

        $("#closeForecastBtn")
            .off("click.commonForecast")
            .on("click.commonForecast", closeModal);

        $("#forecastModal")
            .off("click.commonForecast")
            .on("click.commonForecast", function (e) {
                if (e.target === this) closeModal();
            });

        $("#forecastFields input[type='range']")
            .off("input.commonForecast")
            .on("input.commonForecast", syncLabels);

        $("#resetForecastBtn")
            .off("click.commonForecast")
            .on("click.commonForecast", function () {
                PIPELINE_WEIGHTS = { ...DEFAULT_PIPELINE_WEIGHTS };
                setFormValues(PIPELINE_WEIGHTS);
            });

        // inside AttachForecastModalEvents(), replace apply handler
        $("#applyForecastBtn")
            .off("click.commonForecast")
            .on("click.commonForecast", function () {
                $("#forecastFields input[type='range']").each(function () {
                    const key = $(this).data("weight");
                    PIPELINE_WEIGHTS[key] = Number($(this).val() || 0);
                });

                // optional specific hook
                $(document).trigger("forecastConfigApplied", [{ ...PIPELINE_WEIGHTS }]);

                // critical: force all pages to re-run their data load using global filters
                $(document).trigger("commonFilterChanged", [GetFilterValues()]);

                closeModal();
            });
    };

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // add these helpers inside attach_common_events()

    const ExportCurrentViewExcel = () => {
        const wb = XLSX.utils.book_new();

        // Summary from header/filter scope
        const summary = [
            ["ICBA Explorer - Export"],
            ["As-of", $("#asOf").text().trim()],
            ["Scope", $("#scopeCount").text().trim()],
            ["Generated", new Date().toLocaleString()]
        ];

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

        // First visible data table in page content
        const table = document.querySelector("#content table.data");
        if (table) {
            const ws = XLSX.utils.table_to_sheet(table);
            XLSX.utils.book_append_sheet(wb, ws, "Data");
        }

        XLSX.writeFile(wb, `ICBA_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const CaptureContentCanvas = () =>
        html2canvas(document.querySelector("#content"), {
            scale: 2,
            backgroundColor: "#f6f7f9",
            useCORS: true
        });

    const ExportCurrentViewPdf = async () => {
        const canvas = await CaptureContentCanvas();
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const margin = 24;
        const ratio = Math.min((pw - margin * 2) / canvas.width, (ph - margin * 2) / canvas.height);

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, canvas.width * ratio, canvas.height * ratio);
        pdf.save(`ICBA_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const ExportCurrentViewPpt = async () => {
        try {
            if (typeof PptxGenJS === "undefined") {
                console.error("PptxGenJS is not loaded.");
                return;
            }

            const content = document.querySelector("#content");
            if (!content) {
                console.error("#content not found.");
                return;
            }

            const canvas = await html2canvas(content, {
                scale: 2,
                backgroundColor: "#f6f7f9",
                useCORS: true
            });

            const pptx = new PptxGenJS();
            pptx.defineLayout({ name: "W", width: 13.33, height: 7.5 });
            pptx.layout = "W";

            const slide = pptx.addSlide();
            slide.addText($("#pageTitle").text().trim(), {
                x: 0.4, y: 0.2, w: 12.2, h: 0.5, fontSize: 22, bold: true, color: "002677"
            });

            const ar = canvas.width / canvas.height;
            let w = 12.5, h = w / ar;
            if (h > 6.5) { h = 6.5; w = h * ar; }

            slide.addImage({
                data: canvas.toDataURL("image/png"),
                x: (13.33 - w) / 2,
                y: 0.9,
                w,
                h
            });

            await pptx.writeFile({ fileName: `ICBA_Report_${new Date().toISOString().slice(0, 10)}.pptx` });
        } catch (err) {
            console.error("PPT export failed:", err);
        }
    };

    const formatCount = (n) => Number(n || 0).toLocaleString("en-US");

    // inside attach_common_events(), update GetFilterValues()
    const GetFilterValues = () => {
        $("#filterFields select[data-fk]").each(function () {
            const key = $(this).data("fk");
            if (key) {
                FILTERS[key] = $(this).val() || "";
            }
        });

        return {
            capability: FILTERS.capability,
            business: FILTERS.business,
            geo: FILTERS.geo,
            priority: FILTERS.priority,
            stage: FILTERS.stage,
            timeType: TIME_FILTER.type,
            year: TIME_FILTER.year,
            start: TIME_FILTER.start,
            end: TIME_FILTER.end,

            // add pipeline weights to shared filter payload
            pipelineWeights: { ...PIPELINE_WEIGHTS },
            inApproval: PIPELINE_WEIGHTS.inApproval,
            approvedNoOwner: PIPELINE_WEIGHTS.approvedNoOwner,
            approvedWithPlan: PIPELINE_WEIGHTS.approvedWithPlan,
            inImplementation: PIPELINE_WEIGHTS.inImplementation,
            implementedNotValidated: PIPELINE_WEIGHTS.implementedNotValidated,
            validated: PIPELINE_WEIGHTS.validated
        };
    };

    const GetTimeFilterLabel = () => {
        if (TIME_FILTER.type === "all") return "";
        if (TIME_FILTER.type === "ytd") return "Year to date";
        if (TIME_FILTER.type === "year") return TIME_FILTER.year || "";

        if (TIME_FILTER.type === "range") {
            if (!TIME_FILTER.start && !TIME_FILTER.end) return "";
            return `${TIME_FILTER.start || "..."} → ${TIME_FILTER.end || "..."}`;
        }

        return "";
    };

    const GetActiveFilterList = () => {
        const result = [];
        const labels = {
            capability: "Capability",
            business: "Business",
            geo: "Geo",
            priority: "Priority",
            stage: "Stage"
        };

        Object.keys(FILTERS).forEach(key => {
            const value = FILTERS[key];
            if (!value) return;
            result.push([labels[key], value]);
        });

        const timeLabel = GetTimeFilterLabel();
        if (timeLabel) {
            result.push(["Time", timeLabel]);
        }

        return result;
    };

    const RenderScopeChips = () => {
        const filters = GetActiveFilterList();
        const $host = $("#scopeChips");
        if ($host.length === 0) return;

        if (filters.length === 0) {
            $host.html(`
                <span class="chip">
                    Scope:
                    <b>All ideas</b>
                </span>
            `);
            return;
        }

        const html = filters
            .map(([label, value]) => `
                <span class="chip">
                    ${escapeHtml(label)}:
                    <b>${escapeHtml(value)}</b>
                </span>
            `)
            .join("");

        $host.html(html);
    };

    const SetScopeCount = (count) => {
        const $scopeCount = $("#scopeCount");
        if ($scopeCount.length === 0) return;
        $scopeCount.text(`${formatCount(count)} records`);
    };

    const RenderTimeExtra = () => {
        const $host = $("#timeExtra");
        if ($host.length === 0) return;

        if (TIME_FILTER.type !== "range") {
            $host.empty();
            return;
        }

        $host.html(`
            <input
                type="date"
                data-time-start
                value="${escapeHtml(TIME_FILTER.start || "")}"
                aria-label="From" />
            <span>→</span>
            <input
                type="date"
                data-time-end
                value="${escapeHtml(TIME_FILTER.end || "")}"
                aria-label="To" />
        `);

        $host.find("[data-time-start]")
            .off("change.commonFilter")
            .on("change.commonFilter", function () {
                TIME_FILTER.start = $(this).val() || "";
                ApplyFilters();
            });

        $host.find("[data-time-end]")
            .off("change.commonFilter")
            .on("change.commonFilter", function () {
                TIME_FILTER.end = $(this).val() || "";
                ApplyFilters();
            });
    };

    const ApplyFilters = () => {
        const filters = GetFilterValues();
        RenderScopeChips();

        $(document).trigger("commonFilterChanged", [filters]);
    };

    const ResetFilters = () => {
        Object.keys(FILTERS).forEach(key => {
            FILTERS[key] = "";
        });

        TIME_FILTER.type = "all";
        TIME_FILTER.year = "";
        TIME_FILTER.start = "";
        TIME_FILTER.end = "";

        $("#filterFields select[data-fk]").each(function () {
            $(this).val("");
        });

        const $time = $("#filterFields select[data-time]");
        if ($time.length) {
            $time.val("all");
        }

        RenderTimeExtra();
        RenderScopeChips();

        $(document).trigger("commonFilterChanged", [GetFilterValues()]);
    };

    const AttachFilterEvents = () => {
        $("#filterFields select[data-fk]")
            .off("change.commonFilter")
            .on("change.commonFilter", function () {
                const key = $(this).data("fk");
                const value = $(this).val() || "";

                if (key) {
                    FILTERS[key] = value;
                }

                ApplyFilters();
            });

        $("#filterFields select[data-time]")
            .off("change.commonFilter")
            .on("change.commonFilter", function () {
                const value = $(this).val() || "all";

                if (value.startsWith("year:")) {
                    TIME_FILTER.type = "year";
                    TIME_FILTER.year = value.substring(5);
                } else {
                    TIME_FILTER.type = value;
                    TIME_FILTER.year = "";
                }

                if (value !== "range") {
                    TIME_FILTER.start = "";
                    TIME_FILTER.end = "";
                }

                RenderTimeExtra();
                ApplyFilters();
            });

        $("#resetBtn")
            .off("click.commonFilter")
            .on("click.commonFilter", function () {
                ResetFilters();
            });

        $("#forecastBtn")
            .off("click.commonFilter")
            .on("click.commonFilter", function () {
                const filters = GetFilterValues();
                $(document).trigger("forecastConfigClicked", [filters]);
            });
    };

    // replace AttachHeaderEvents with this

    const AttachHeaderEvents = () => {
        const $btn = $("#exportBtn, #btnExport");
        const $menu = $("#exportMenu");

        const closeMenu = () => $menu.removeClass("open");

        const requestExport = async (type) => {
            const filters = GetFilterValues();

            // page-level override hook
            const evt = $.Event("commonExportRequested");
            $(document).trigger(evt, [type, filters]);
            if (evt.isDefaultPrevented()) return;

            // fallback exporters
            if (type === "xlsx") await ExportCurrentViewExcel();
            else if (type === "pdf") await ExportCurrentViewPdf();       // PDF report
            else if (type === "ppt") await ExportCurrentViewPpt();
        };

        $btn.off("click.commonHeader").on("click.commonHeader", function (e) {
            e.stopPropagation();
            $menu.toggleClass("open");
        });

        $menu.off("click.commonHeader").on("click.commonHeader", function (e) {
            e.stopPropagation();
        });

        $(document).off("click.commonHeader").on("click.commonHeader", closeMenu);

        $("#exXlsx").off("click.commonHeader").on("click.commonHeader", async () => {
            closeMenu();
            await requestExport("xlsx");
        });

        $("#exPdf").off("click.commonHeader").on("click.commonHeader", async () => {
            closeMenu();
            await requestExport("pdf");
        });

        $("#exPpt").off("click.commonHeader").on("click.commonHeader", async () => {
            closeMenu();
            await requestExport("ppt");
        });

        $(document)
            .off("commonFilterResultCountChanged.commonFilter")
            .on("commonFilterResultCountChanged.commonFilter", function (_e, count) {
                SetScopeCount(count);
            });
    };

    const InitializeFilters = () => {
        $("#filterFields select[data-fk]").each(function () {
            const key = $(this).data("fk");
            if (!key) return;
            FILTERS[key] = $(this).val() || "";
        });

        const $time = $("#filterFields select[data-time]");
        if ($time.length) {
            const value = $time.val() || "all";

            if (value.startsWith("year:")) {
                TIME_FILTER.type = "year";
                TIME_FILTER.year = value.substring(5);
            } else {
                TIME_FILTER.type = value;
                TIME_FILTER.year = "";
            }
        }

        RenderTimeExtra();
        RenderScopeChips();
    };

    const Init = () => {
        InitializeFilters();
        AttachHeaderEvents();
        AttachFilterEvents();
        AttachForecastModalEvents(); 
    };

    Init();

    window.CommonFilters = {
        getValues: () => GetFilterValues(),
        apply: () => ApplyFilters(),
        reset: () => ResetFilters(),
        refreshEvents: () => {
            AttachHeaderEvents();
            AttachFilterEvents();
        },
        setScopeCount: (count) => SetScopeCount(count)
    };
}
// Staggered entrance animation + pillars highlight cycle
$(function () {
    // Staggered entrance animation for the dashboard
    var $items = $(".brand-logo, .nav-item, .topbar > *, .filterbar, .note-strip, .section-head, .card");
    $items.addClass("reveal");
    $items.each(function (i) {
        var $el = $(this);
        setTimeout(function () { $el.addClass("in"); }, 60 + i * 40);
    });
    setTimeout(function () { $items.removeClass("reveal in"); }, 60 + $items.length * 40 + 700);

    // Cycle highlight on PEOPLE / IDEAS / SOLUTIONS / BETTER CARE
    var $pillars = $(".sidebar .pillars li"), p = 0;
    if ($pillars.length) {
        setInterval(function () {
            $pillars.removeClass("is-on").eq(p++ % $pillars.length).addClass("is-on");
        }, 1800);
    }
});