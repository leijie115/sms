const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';
const shouldAnalyze = process.env.ANALYZE === 'true';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './client/src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
    chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    publicPath: '/',
    clean: true
  },
  
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react-vendor',
          priority: 20,
        },
        antd: {
          test: /[\\/]node_modules[\\/](antd|@ant-design|rc-|@rc-component)[\\/]/,
          name: 'antd-vendor', 
          priority: 15,
        },
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'commons',
          priority: 10,
        },
      },
    },
    
    runtimeChunk: 'single',
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3,
              }],
              '@babel/preset-react'
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
            ],
            cacheDirectory: true,
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,
          },
        },
      },
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './client/index.html',
      filename: 'index.html',
      // 只在 favicon.ico 存在时添加
      favicon: fs.existsSync('./client/public/favicon.ico') 
        ? './client/public/favicon.ico' 
        : undefined,
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),
    
    // 复制静态文件
    new CopyPlugin({
      patterns: [
        {
          from: 'client/public',
          to: '',
          globOptions: {
            ignore: ['**/favicon-preview.html', '**/.DS_Store', '**/Thumbs.db'],
          },
          noErrorOnMissing: true, // 目录不存在时不报错
        },
      ],
    }),
    
    ...(isProduction ? [
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].chunk.css',
      }),
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html)$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
    ] : []),
    
    ...(shouldAnalyze ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: true,
      })
    ] : []),
  ],
  
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  
  performance: {
    hints: false,
  },
  
  devServer: {
    port: 3001,
    hot: true,
    historyApiFallback: true,
    compress: true,
    // 配置静态文件服务（开发模式）
    static: [
      {
        directory: path.join(__dirname, 'client/public'),
        publicPath: '/',
        watch: true, // 监听文件变化
      },
      {
        directory: path.join(__dirname, 'client'),
        publicPath: '/',
      }
    ],
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    ]
  },
  
  devtool: isProduction ? false : 'eval-source-map',
};