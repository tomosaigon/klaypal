import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
// import { Contract } from "ethers";

/**
 * Deploys a contract named "TelegramBotVault" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTelegramBotVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("TelegramBotVault", {
    from: deployer,
    // Contract constructor arguments
    args: ["0xBE4B9051F06C2D676A203cc92a62f064615a7eaF"],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  // const TelegramBotVault = await hre.ethers.getContract<Contract>("TelegramBotVault", deployer);
  // console.log("👋 Initial greeting:", await TelegramBotVault.greeting());
};

export default deployTelegramBotVault;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags TelegramBotVault
deployTelegramBotVault.tags = ["TelegramBotVault"];
