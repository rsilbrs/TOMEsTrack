module.exports = {
  // ... outras configurações existentes
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined");
      }

      // Adicione seus middlewares aqui se necessário

      return middlewares;
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: [/node_modules\/stylis-plugin-rtl/],
      },
    ],
  },
};
