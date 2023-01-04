const { getNamedAccounts, ethers } = require("hardhat");
const AMOUNT = ethers.utils.parseEther("1");

async function getWeth() {
  const { deployer } = await getNamedAccounts();
  //在weth合约调用deposit方法
  //weth.mainnet:https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  //你需要abi ,合约地址
  //0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
  //获取指定地址的合约，第一个参数是合约名，第二个参数是合约地址,第三个参数是部署者
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  );
  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`got ${wethBalance.toString()} weth`);
}

module.exports = { getWeth, AMOUNT };
