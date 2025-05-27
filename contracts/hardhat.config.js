require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true, // Enable Yul optimizer if applicable
        },
      },
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  },
};
