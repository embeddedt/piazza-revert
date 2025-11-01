import { UserscriptPlugin }  from 'webpack-userscript';
import webpack from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';

const dev = process.env.NODE_ENV === 'development';

export default {
  mode: dev ? 'development' : 'production',
  entry: './src/userscript.js',
  output: {
    filename: 'revert.js'
  },
  devServer: {
    webSocketServer: false,
    static: {
      directory: path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
    }
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        type: 'asset/source',
        use: [
          "sass-loader"
        ],
      },
      {
        test: /\.css$/i,
        type: 'asset/source'
      }
    ],
  },
  plugins: [
    new UserscriptPlugin({
      headers: (original) => {
        /** @type {HeadersProps} */
        const customHeaders = {
          name: 'Piazza Revert',
          namespace: 'https://github.com/embeddedt',
          description: 'Revert Piazza to the old user interface',
          icon: 'https://www.google.com/s2/favicons?sz=64&domain=piazza.com',
          author: 'embeddedt',
          match: 'https://piazza.com/*',
          homepage: 'https://github.com/embeddedt/piazza-revert',
          connect: ['piazza.com'],
          grant: ['GM_addStyle', 'GM_addElement', 'GM_xmlhttpRequest'],
          version: `${original.version}-build.[buildTime]`
        };
        if (!dev) {
          const prodURL = 'https://github.com/embeddedt/piazza-revert/raw/refs/heads/main/';
          customHeaders.updateURL = prodURL + 'revert.meta.js';
          customHeaders.downloadURL = prodURL + 'revert.user.js';
        }
        return {
          ...original,
          ...customHeaders
        }
      }
    }),
    new webpack.BannerPlugin({
      banner: '/* Unminified source code is readable at https://github.com/embeddedt/piazza-revert */',
      raw: true,      // if false (default), webpack wraps it in a comment
      entryOnly: true // only add to entry chunks
    })
  ]
};

