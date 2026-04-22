var _ = require('lodash');
var poParser = require('gettext-parser');
var jsParser = require('jsxgettext');
var deepDiff = require('deep-diff');

module.exports = (function() {

  function inspect(arg) {
    return require('util').inspect(arg, {depth:10});
  }

  function transformMap(fn) {
    return function(memo, val, key) {
      memo[key] = fn(val);
      return memo;
    };
  }

  return {
    parse: function(poFiles, sourceFiles, options) {

      if(!poFiles) {
        throw new Error('First argument should be a map to po files' +
          'The key is the filename and the value is the po file contents.');
      }

      if(!sourceFiles) {
        throw new Error('Second argument should be a map to source files.' +
          'The key is the filename and the value is the source code.');
      }

      options = options || {};

      // Convert the (filename, poString) structure into (filename, poJSON).
      var existingPos = _.reduce(poFiles, transformMap(poParser.po.parse), {});

      // Parses the map of source files and creates a poJSON structure.
      var srcPo = poParser.po.parse(jsParser.generate(sourceFiles, options));

      //TODO: extract
      _.each(existingPos, function(existing) {

        // If the supplied PO is empty, the lhs will be undefined with no path.
        existing.translations[''] = existing.translations[''] || {'':{}};

        var lhs = existing.translations[''];
        var rhs = srcPo.translations[''];
        deepDiff.observableDiff(lhs, rhs, function(diff) {
          // Differences between the msgid parsed from source (an empty string) and those
          // already in a po file (added by translator) are expected to be different.
          if(_.contains(diff.path, 'msgstr')) return;

          // Encountered a new tr() key in the source that isn't in the PO file.
          if(diff.kind === 'N') {
            deepDiff.applyChange(lhs, rhs, diff);
          }
        });
      });

      // Recompile the updated JSON PO structure into a .po file.
      // TODO: I'd like to use `transformMap` but the toString is problematic.
      return _.reduce(existingPos, function(memo, po, key) {
        memo[key] = poParser.po.compile(po).toString();
        return memo;
      }, {});
    }
  };
})();

// --- WEB SERVER ADDITION FOR RENDER ---

const http = require('http');

// Render gives your app a secret Port number. This line finds it.
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  // THE FIX: charset=utf-8 tells the browser how to read emojis!
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); 
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>PoCreate Live</title>
      </head>
      <body style="background-color: #1a1a2e; color: #ffffff; font-family: sans-serif; text-align: center; padding-top: 100px;">
        <div style="border: 2px solid #0f3460; display: inline-block; padding: 40px; border-radius: 20px; background-color: #16213e; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <h1 style="color: #e94560; font-size: 50px; margin-bottom: 10px;">🚀 PoCreate is LIVE!</h1>
          <p style="font-size: 20px; color: #abb2bf;">My Chromebook just built this in the cloud.</p>
          <hr style="border: 0; height: 1px; background: #0f3460; margin: 20px 0;">
          <div style="font-size: 60px;">💻 ✨ 🔥</div>
          <p style="margin-top: 20px; font-style: italic; color: #533483;">Status: Error-Free and Running</p>
        </div>
      </body>
    </html>
  `);
});

server.listen(port, () => {
  console.log('Server is listening on port ' + port);
});
