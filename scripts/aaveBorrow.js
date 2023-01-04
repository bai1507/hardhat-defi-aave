const hre = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");
async function main() {
  //将0.02个eth抵押成0.02个weth
  await getWeth();
  const { deployer } = await getNamedAccounts();
  //lending pool address provider:0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  const lendingPool = await getLendingPool(deployer);
  console.log(lendingPool.address);
  //抵押功能的实现
  const wethaddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  await approveErc20(wethaddress, lendingPool.address, AMOUNT, deployer);
  console.log("depositing....");
  //lendingPool合约中有抵押的操作函数，会返回具体价值的atoken，需要weth地址，抵押的金额，收atoken的人，0默认
  await lendingPool.deposit(wethaddress, AMOUNT, deployer, 0);
  console.log("deposited");

  //借钱的实现
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );
  const ethToDai = await getDAIPrice();
  //1个daiToken = 0.000813577933246979ETH 浮动
  console.log(`the DAI/ETH prize is ${ethToDai.toString()}`);
  //这里的0.95是指只借95%的金额
  //（允许借款金额ETH*0.95）* (1/实时汇率）= 能借款DAI
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / ethToDai.toNumber());
  console.log(`u can borrow ${amountDaiToBorrow} DAI`);
  const amounytDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  //dai token address on mainnet
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(
    daiTokenAddress,
    lendingPool,
    amounytDaiToBorrowWei,
    deployer
  );
  await getBorrowUserData(lendingPool, deployer);

  //还钱
  await repay(amounytDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("repaid");
}
async function borrowDai(
  daiAddress,
  lendingPool,
  amounytDaiToBorrowWei,
  account
) {
  //借款函数
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amounytDaiToBorrowWei,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("u've borrowed");
}
async function getDAIPrice() {
  //不需要deployer，因为是只读的
  //eth等其他资产的汇率，https://docs.chain.link/data-feeds/price-feeds/addresses
  const daiETHpriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const prize = (await daiETHpriceFeed.latestRoundData())[1];
  return prize;
}
async function getBorrowUserData(lendingPool, account) {
  //获取抵押后的资产数据：
  //totalCollateralETH:价值多少ETH的抵押
  //totalDebtETH:借了多少
  //availableBorrowsETH::允许借款
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`u have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`u have ${totalDebtETH} worth of ETH borrowed`);
  console.log(`u can borrow ${availableBorrowsETH} worth of ETH `);
  return { availableBorrowsETH, totalDebtETH };
}
async function getLendingPool(account) {
  //通过provider，返回lendingpool的地址
  const ILendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress =
    await ILendingPoolAddressesProvider.getLendingPool();
  //获取到的lendingpool地址，可以获取该合约，方便实现对应的函数
  const ILendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return ILendingPool;
}
async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  //由于deposit函数中用到了transferfrom,需要授权抵押
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
