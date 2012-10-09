function timestamp() {
    return Math.round((new Date()).getTime());
}

SERIES = {};

POINTS = 400;

COLORS = d3.scale.category10().range();

ENTITIES = {};
CHECKS = {};

function nextColor() {
    var used = [];
    for(n in SERIES) {
        used.push(SERIES[n].color);
    }

    for(n in COLORS){
        if(used.indexOf(COLORS[n]) < 0) {
            return COLORS[n];
        }
    }
}

function Series(entity_id, check_id, metric_name) {
    this.values = [];
    this.entity_id = entity_id;
    this.check_id = check_id;
    this.metric_name = metric_name;
}

function toKey(series) {
    return [series.entity_id, series.check_id, series.metric_name].join();
}

function fromKey(str) {
    var list = str.split(',');
    return {'entity_id': list[0], 'check_id': list[1], 'metric_name': list[2]}
}

function getMetricUrl(series) {

    return "/proxy/entities/" + series.entity_id +
        "/checks/" + series.check_id +
        "/metrics/" + series.metric_name +
        "?from=" + FROM + "&to=" + TO + "&points=" + POINTS;
}

function toValues(data, name) {
    var values = [];
    for(n in data) {
        values.push({x: new Date(data[n]['timestamp']), y: data[n]['average']} );
    }
    return values;
}

function getDatumList(dict) {
    var list = [];
    for( n in SERIES ){
        var s = SERIES[n];
        list.push( {values: s.values,
                    color: s.color,
                    key: s.name});
    }
    return list;
}

function updateChart() {
    d3.select('#chart svg')
        .datum(getDatumList())
        .call(chart.update);

    var $target = $("#metrictable");

    $target.find("tr:gt(0)").remove();

    for(var n in SERIES) {
        var s = SERIES[n];

        $target.append($('<tr>')
            .append($('<td>').append(s.entity_label),
                    $('<td>').append(s.check_label),
                    $('<span>').attr('class', 'label')
                                .attr('style', 'background-color:' + s.color).append(s.metric_name + ' ')
                                    .append(
                                        $('<a>').attr('href', '#').attr('onclick','removeSeries(SERIES["' + n + '"], true)' )
                                        .append(
                                            $('<span>').attr('class', 'icon-remove')
                                        )
                                    )
            )
        );
    }
}

function loadSeriesData(s, update) {
    return jQuery.getJSON(getMetricUrl(s), function(response) {
        s.values = toValues(response.values);
        s.name = s.metric_name;
        if(update) updateChart();
    });
}

function addSeries(s, update) {
    var key = toKey(s);
    SERIES[key] = s;
    s.color = nextColor();
    return loadSeriesData(s, update);
}

function removeSeries(s, update) {
    var key = toKey(s);
    delete SERIES[key];
    if(update) updateChart();
}

function toggleSeries(s, update){
    var key = toKey(s);

    if(key in SERIES){
        removeSeries(SERIES[key], update);
    } else {
        addSeries(s, update);
    }
}

function resetSeries(update) {
    for( key in SERIES ) {
        var s = SERIES(key);
        removeSeries(s, false);
    }
    if(update) updateChart();
}

function reloadData(update) {
    var deferreds = [];
    for(key in SERIES) {
        var s = SERIES[key];
        deferreds.push(loadSeriesData(s), false);
    }
    if (update) {
        $.when.apply($, deferreds).done(updateChart);
    }
}

HOUR = 60*60*1000;
DATERANGES = {
    "hour": {text: "Last hour", offset: HOUR, dateformat: "%l:%M"},
    "6hour": {text: "Last 3 hours", offset: 3*HOUR, dateformat: "%l:%M"},
    "day": {text: "Last day", offset: 24*HOUR, dateformat: "%l:%M"},
    "week": {text: "Last week", offset: 7*24*HOUR, },
    "month": {text: "Last month", offset: 30*24*HOUR},
    "6month": {text: "Last 6 months", offset: 182*24*HOUR},
    "year": {text: "Last year", offset: 365*24*HOUR}
};

function setDateRange(range, update) {
    var ts = timestamp();
    TO = ts;
    FROM = ts-DATERANGES[range].offset;

    var drs = $("#daterangeselect > a");
    drs.text(DATERANGES[range].text + ' ').append($('<span>').attr('class', 'caret'));

    reloadData(update);
}

function metricClick(event) {
    var $target = $(event.currentTarget);

    var entity_id = $target.attr('data-entity-id');
    var entity_label = ENTITIES[entity_id]['label'];

    var check_id = $target.attr('data-check-id');
    var check_label = CHECKS[check_id]['label'];

    var metric_name = $target.attr('data-metric-name');

    var s = new Series(entity_id, check_id, metric_name);
    s.entity_label = entity_label;
    s.check_label = check_label;

    toggleSeries(s, true);
}


function metricAccord(entity_id, check_id, metric_name) {
    $e = $('<p>').append(
        $('<a>').attr('href', '#').attr('data-entity-id', entity_id).attr('data-check-id', check_id).attr('data-metric-name', metric_name).click(metricClick).append("Metric: <strong>" + metric_name + "</strong> ")
    );
    return $e;
}

function fetchChecks() {

}

function checkClick(event) {
    var $target = $(event.currentTarget);
    var $child = $($target.attr("data-child"))
    var entity_id = $target.attr('data-entity-id');
    var check_id = $target.attr('data-check-id');

    if ( $child.children().length > 0) {
        $child.empty();
    } else {
        $target.find("img").show();


        jQuery.getJSON("/proxy/entities/" + entity_id + "/checks/" + check_id + "/metrics", function(data) {
            $.each(data.values, function(index, metric){
                $child.append(metricAccord(entity_id, check_id, metric['name']));
            });

            $target.find("img").hide();
        })
    }
}


function checkAccord(entity_id, check_id, check_name) {
    $e = $('<div>').addClass('accordion-group')
            .append(
                $('<div>').addClass("accordion-heading").append(
                    $('<a>').addClass("accordion-toggle").attr("data-toggle", "collapse").attr("data-parent", entity_id + "Checks").attr("data-child", "#" + check_id + "Metrics").attr("href", "#" + check_id + "Body").attr("data-entity-id", entity_id).attr("data-check-id", check_id).click(checkClick)
                        .append(
                            "Check: <strong>" + check_name + "</strong> ",
                            $('<img>').addClass('checkloading').attr("src", '/img/loading_spinner.gif').hide()
                        )
                ),
                $('<div>').attr("id", check_id + "Body").addClass("accordion-body collapse")
                    .append($('<div>').addClass("accordion-inner")
                        .append(
                            $('<div>').addClass("accordian").attr("id", check_id + "Metrics")
                        )
                    )
            );
    return $e;
}

function entityClick(event) {
    var $target = $(event.currentTarget);
    var entity_id = $target.attr('data-entity-id');

    $("#checklist").empty();
    $("#checkloading").show();


    jQuery.getJSON("/proxy/entities/" + entity_id + "/checks", function(data) {
        if(data.values.length > 0) {
            $.each(data.values, function(index, check){
                $("#checklist").append(checkAccord(entity_id, check['id'], check['label']));
                CHECKS[check['id']] = check;
            });
        } else {
            $("#checklist").append($('<p>').append("No checks found!"))
        }
        $("#checkloading").hide();
    })

    $('#checkheader').empty().append("Checks for <strong>" + ENTITIES[entity_id]['label'] + "</strong>:");
    $('#navtabs a[href="#checktab"]').tab('show');
}

// function initSeries() {
//     var params = $.deparam(window.location.search.substring(1));

//     _.each(params.series.split(';'), function(s) {
//         s = s.split(',');
//         jQuery.getJSON("/proxy/entities/" + s[0] + "?json=true", function(data) {
//         _.each(data, function(check){
//             CHECKS[check['id']] = check;
//             series = new Series(s[0], s[1], s[2]);
//             series.entity_name = ENTITIES[s[0]].label;
//             series.check_name = CHECKS[s[1]].label;
//             addSeries(series , true);
//         })
//     })


//     });
// }

// Load all entities
jQuery.getJSON("/proxy/entities", function(data) {

    $.each(data.values, function(index, entity){
        /*$("#entitylist").append(entityAccord(entity['id'], entity['label']));*/
        ENTITIES[entity['id']] = entity;
    });

    $('#entitytable').dataTable( {
        "aaData": _.map(data.values, function(e) {return [e['label'], e['id']]}),
        "aoColumns": [
            { "sTitle": "Entity Name"},
        ],
        "fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $('td:eq(0)', nRow).empty().append(
                $('<a>').attr("href", "#").attr("data-entity-id", aData[1]).click(entityClick).append(
                    "Entity: <strong>" + aData[0] + "</strong>"
                )
            );

        }

    });

    $('#entitytable_paginate').addClass("pager");
    $('#entitytable_previous').addClass("previous");
    $('#entitytable_previous').attr("stlyle", "left: 0");
    $('#entitytable_next').attr("stlyle", "float:right;");

    //initSeries();
});


var chart = nv.models.lineChart();

nv.addGraph(function() {

    chart.xScale(d3.time.scale());

    chart.xAxis
        .showMaxMin(false)
        .axisLabel('Date')
        .ticks(d3.time.scale().ticks(5))
        .tickFormat(d3.time.scale().tickFormat(5));

    chart.yAxis
        .axisLabel('')
        .tickFormat(d3.format('.02f'));

    d3.select('#chart svg')
        .call(chart);

    return chart;
});


for(var r in DATERANGES) {
    $target = $("#daterangeselect > ul");

    $target.append(
        $('<li>').append(
            $('<a>').attr('href', '#').attr('onclick', 'setDateRange("' + r + '", true)')
            .append(DATERANGES[r].text)
        )

    );
}

setDateRange('day');
$("#chart").resize(updateChart);