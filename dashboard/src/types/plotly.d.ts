/**
 * Type declarations for plotly.js-dist-min
 * 
 * The minified distribution doesn't include types, so we declare it
 * to use the same types as the full plotly.js package.
 */

declare module 'plotly.js-dist-min' {
  import Plotly from 'plotly.js';
  export = Plotly;
}
