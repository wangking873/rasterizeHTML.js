// html2canvas
// Distributed under the MIT License
// For source and documentation visit:
// http://www.github.com/cburgmer/html2canvas
/*global window*/

var HTML2Canvas = (function () {
    "use strict";

    var module = {};

    /* Inlining */

    var getDataURIForImage = function (image) {
        var canvas = window.document.createElement("canvas"),
            context = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        return canvas.toDataURL("image/png");
    };

    var encodeImageAsDataURI = function (image, finishHandler) {
        var img = new window.Image();

        img.onload = function () {
            image.src = getDataURIForImage(img);

            finishHandler();
        };
        img.src = image.attributes.src.nodeValue; // Chrome 19 sets image.src to ""
    };

    module.loadAndInlineImages = function (doc, finishHandler) {
        var images = doc.getElementsByTagName("img"),
            imagesToFinalize = images.length,
            i;

        var finishWorker = function () {
            imagesToFinalize--;

            if (finishHandler && imagesToFinalize === 0) {
                finishHandler();
            }
        };

        for(i = 0; i < images.length; i++) {
            encodeImageAsDataURI(images[i], finishWorker);
        }
    };

    /* Rendering */

    var needsXMLParserWorkaround = function() {
        // See https://bugs.webkit.org/show_bug.cgi?id=47768
        return window.navigator.userAgent.indexOf("WebKit") >= 0;
    };

    var serializeToXML = function (doc) {
        var xml;

        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        xml = (new window.XMLSerializer()).serializeToString(doc.documentElement);
        if (needsXMLParserWorkaround() && window.HTMLtoXML) {
            return window.HTMLtoXML(xml);
        } else {
            return xml;
        }
    };

    var supportsBlobBuilding = function () {
        if (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder) {
            // Deprecated interface
            return true;
        } else {
            if (window.Blob) {
                // Available as constructor only in newer builds for all Browsers
                try {
                    new window.Blob('<b></b>', { "type" : "text\/xml" });
                    return true;
                } catch (err) {
                    return false;
                }
            }
        }
        return false;
    };

    var getBlob = function (data) {
       var imageType = "image/svg+xml;charset=utf-8",
           BLOBBUILDER = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder,
           svg;
       if (BLOBBUILDER) {
           svg = new BLOBBUILDER();
           svg.append(data);
           return svg.getBlob(imageType);
       } else {
           return new window.Blob(data, {"type": imageType});
       }
    };

    var buildImageUrl = function (svg) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            return DOMURL.createObjectURL(getBlob(svg));
        } else {
            return "data:image/svg+xml;charset=utf-8," + svg;
        }
    };

    var cleanUpUrl = function (url) {
        var DOMURL = window.URL || window.webkitURL || window;
        if (supportsBlobBuilding()) {
            DOMURL.revokeObjectURL(url);
        }
    };

    var workAroundWebkitBugForInlinedImages = function (svg) {
        // Chrome & Safari will not show the inlined image until the svg is connected to the DOM it seems.
        var doNotGarbageCollect = window.document.createElement("div");
        doNotGarbageCollect.innerHTML = svg;
    };

    module.getSvgForDocument = function (doc) {
        var html = serializeToXML(doc);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                '<foreignObject width="100%" height="100%">' +
                    html +
                '</foreignObject>' +
            '</svg>'
        );
    };

    module.drawSvgToCanvas = function (svg, canvas, finishHandler) {
        var context, DOMURL, url, image;

        context = canvas.getContext("2d");

        url = buildImageUrl(svg);

        image = new window.Image();
        image.onload = function() {
            context.drawImage(image, 0, 0);
            cleanUpUrl(url);

            if (typeof finishHandler !== "undefined") {
                finishHandler(canvas);
            }
        };
        image.src = url;

        workAroundWebkitBugForInlinedImages();
    };

    return module;
}());
