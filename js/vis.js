
var visWidth = 1100;
var visHeight = 700;

// pulls out all the sentences
// TODO: we don't really need the lengths at all - remove
// TODO: whitespace seems to be removed?
//  - more likely - the interesting spacing is removed in the gutenberg version
var sentenceLengths = function(text) {
  // text = text.replace(/['\"\‘\’]/gm,"");
  tregex = /\n|([^\r\n.!?]+([.!?]+|$))/gim;
  var sentences = text.match(tregex).map(function(s) { return s.trim(); });

  var data = sentences.map(function(s) {
    var d = {};
    d.sentence = s;
    d.length = s.length;
    return d;
  });

  return data;
};

// TODO: combine with sentences somehow to link sentence data with word data
var getWords = function(text) {
  text = text.replace(/['\"\‘\’]/gm,"");
  // text = text.replace(/[.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  // remove punctuation
  text = text.replace(/['!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~']/g," ");
  text = text.replace(/\s{2,}/g," ");
  var allWords = text.split(" ").map(function(w) { return {"w": w};});
  //TODO: magic knowledge of the size of the ellipse here.
  var wordCenters = radialPlacement().width(480).height(280).center({"x":visWidth / 2, "y":visHeight / 2 });
  wordCenters(allWords);

  var wordsLen = allWords.length;
  var words = d3.map();
  for(i = 0;i < wordsLen;i++) {
    var word = allWords[i];
    var wordList = [];
    if(words.has(word.w.toLowerCase())) {
      wordList = words.get(word.w.toLowerCase());
    }

    wordList.push({"word":word.w, "index":i, "pos":i / wordsLen, "x":word.x, "y":word.y, "angle":word.angle});
    // if(word.w == "Alice") {
    //   console.log(wordList.length);
    // }
    words.set(word.w.toLowerCase(), wordList);
  }

  // get the version of the word used in the most positions
  // this will be the visual respresentation used
  var getMostFrequent = function(positions) {
    // var words = positions.map(function(p) { return p.word; });

    if (positions.length === 1) {
      return positions[0].word;
    }

    var wordCounts = d3.nest()
      .key(function(p) { return p.word; })
      .rollup(function(words) { return words.length;})
      .entries(positions);

    wordCounts.sort(function(a,b) { return b.values - a.values; });
    return wordCounts[0].key;
  };

  var wordMap = [];
  words.forEach(function(word, positions) {
    var w = {"key":positions[0].word};
    w.visual = getMostFrequent(positions);
    w.x = d3.sum(positions.map(function(p) { return p.x; })) / positions.length;
    w.y = d3.sum(positions.map(function(p) { return p.y; })) / positions.length;
    w.positions = positions;
    // if(word == "Alice") {
    //   console.log(positions);
    // }
    w.count = positions.length;
    wordMap.push(w);
  });

  // sort to put more frequent words on top
  return wordMap.sort(function(a,b) { return a.count - b.count; });
};

// sets up the x and y for a radial layou
// TODO: modified to lazily add parameters to the input keys - so everything
// is expected to be an object. Bad for many reasons.
var radialPlacement = function() {
  var values = d3.map();
  var increment = 20;
  var radius = 200;
  var width = 500;
  var height = 300;
  var tapper = -50;
  var center = {"x":0, "y":0};
  var start = -90;

  var current = start;

  var radialLocation = function(center, angle, width, height, tapper) {
    return {"x":(center.x + (width * Math.cos(angle * Math.PI / 180) - tapper)),
            "y": (center.y + (height * Math.sin(angle * Math.PI / 180) + tapper))};
  };

  // var placement = function(key) {
  //   var value = values.get(key);
  //   if (!values.has(key)) {
  //     value = place(key);
  //   }
  //   return value;
  // };

  var place = function(obj) {
    var value = radialLocation(center, current, width, height, tapper);
    // now it just adds attributes to the object. DANGEROUS
    obj.x = value.x;
    obj.y = value.y;
    obj.angle = current;
    // values.set(obj,value);
    current += increment;
    tapper += increment;
    tapper = Math.min(tapper, 0);
    return value;
  };

  var placement = function(keys) {
    values = d3.map();
    increment = 360 / keys.length;

    keys.forEach(function(k) {
      place(k);
    });
  };

  placement.keys = function(_) {
    if (!arguments.length) {
      return d3.keys(values);
    }
    setKeys(_);
    return placement;
  };

   placement.center = function(_) {
    if (!arguments.length) {
      return center;
    }
    center = _;
    return placement;
   };

  //  placement.radius = function(_) {
  //    if (!arguments.length) {
  //      return radius;
  //    }
   //
  //    radius = _;
  //    return placement;
  //  };

   placement.width = function(_) {
     if (!arguments.length) {
       return width;
     }

     width = _;
     return placement;
   };

   placement.height = function(_) {
     if (!arguments.length) {
       return height;
     }

     height = _;
     return placement;
   };

   placement.start = function(_) {
     if (!arguments.length) {
       return start;
     }
     start = _;
     return placement;
   };

  return placement;
};

var chart = function() {
  var width = visWidth;
  var height = visHeight;
  var margin = {top: 20, right: 20, bottom: 20, left: 20};
  var g = null;
  var data = [];

  var sentenceCenters = radialPlacement().center({"x":width / 2, "y":height / 2 });

  var chart = function(selection) {
    selection.each(function(rawData) {

      var sentences = rawData.sentences;
      sentenceCenters(sentences);

      var words = rawData.words;

      var svg = d3.select(this).selectAll("svg").data([data]);
      var gEnter = svg.enter().append("svg").append("g");

      svg.attr("width", width + margin.left + margin.right );
      svg.attr("height", height + margin.top + margin.bottom );
      g = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var sentence = g.selectAll(".sentence")
        .data(sentences).enter()
        .append("text")
        .attr("class", "sentence")
        .attr("x",  function(d) { return d.x; })
        .attr("y",  function(d) { return d.y; })
        .attr("text-anchor", function(d) { return d.angle > 90 ? "end" : "start"; })
        .attr("fill", "#ddd")
        .attr("opacity", 0.4)
        .attr("font-size", "2px")
        .text(function(d) { return d.sentence; });

      var word = g.selectAll(".word")
        .data(words).enter()
        .append("text")
        .attr("class", "word")
        .attr("x",  function(d) { return d.x; })
        .attr("y",  function(d) { return d.y; })
        .attr("text-anchor", "middle")
        .attr("text-anchor", function(d) { return d.x > (width / 2) ? "end" : "start"; })
        // .attr("font-size", function(d) { return (Math.min(d.count, 12)) + "px";})
        .attr("font-size", "8px")
        // .attr("fill", "#ddd")
        // .attr("opacity", function(d) { return Math.min(d.count / 20, 0.5); })
        // .attr("opacity", function(d) { return d.count > 30 ? 0.9 : 0.4; })
        .attr("fill", function(d) { return d.count > 30 ? "#ddd": "#555"; })
        .text(function(d) { return d.visual; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);
    });
  };

  function mouseover(d,i) {
    var bbox = this.getBBox();
    var direction = d.x > (width / 2) ? -1 : 1;
    g.selectAll(".line")
    .data(d.positions)
    .enter()
    .append("line")
    .attr("class", "line")
    .attr("x1", d.x + (direction * (bbox.width / 2)))
    .attr("y1", d.y - (bbox.height / 3))
    .attr("x2", function(p) { return p.x; })
    .attr("y2", function(p) { return p.y; });

    d3.select("#word").html(d.visual);
  }

  function mouseout(d,i) {
    g.selectAll(".line").remove();
  }

  return chart;
};


function plotData(selector, data, plot) {
  d3.select(selector)
    .datum(data)
    .call(plot);
}

$(document).ready(function() {
  var plot = chart();

  function display(error, text) {
    var sentences = sentenceLengths(text);
    var words = getWords(text);
    plotData("#vis", {"sentences":sentences, "words": words}, plot);
  }

  queue()
    .defer(d3.text, "data/alice.txt")
    .await(display);
});
