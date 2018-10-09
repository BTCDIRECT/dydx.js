import { dydx } from '../helpers/DYDX';
import { BIG_NUMBERS, ADDRESSES } from '../../src/lib/Constants';
import {
  callOpenWithoutCounterparty,
  getBalances,
  setup,
  validate,
  setupDYDX,
} from '../helpers/MarginHelper';
import { resetEVM } from '../helpers/SnapshotHelper';

let accounts = null;

describe('#openWithoutCounterparty', () => {
  beforeAll(async () => {
    await setupDYDX();
    accounts = await dydx.contracts.web3.eth.getAccountsAsync();
  });

  beforeEach(async () => {
    await resetEVM();
  });

  it('succeeds on valid inputs', async () => {
    const openTx = await setup(accounts);
    const [
      traderHeldTokenBalance,
      vaultHeldTokenBalance,
    ] = await getBalances(
      openTx.heldToken,
      [openTx.trader, dydx.contracts.Vault.address],
    );
    const tx = await callOpenWithoutCounterparty(openTx);
    await validate(openTx, tx.id, traderHeldTokenBalance, vaultHeldTokenBalance);
  }, 10000);

  it('succeeds if different nonces are used', async () => {
    const openTx1 = await setup(accounts);
    const [
      traderHeldTokenBalance1,
      vaultHeldTokenBalance1,
    ] = await getBalances(
      openTx1.heldToken,
      [openTx1.trader, dydx.contracts.Vault.address],
    );

    const tx1 = await callOpenWithoutCounterparty(openTx1);
    await validate(openTx1, tx1.id, traderHeldTokenBalance1, vaultHeldTokenBalance1);

    const openTx2 = await setup(accounts);
    const [
      traderHeldTokenBalance2,
      vaultHeldTokenBalance2,
    ] = await getBalances(
      openTx2.heldToken,
      [openTx2.trader, dydx.contracts.Vault.address],
    );

    const tx2 = await callOpenWithoutCounterparty(openTx2);
    await validate(openTx2, tx2.id, traderHeldTokenBalance2, vaultHeldTokenBalance2);
  }, 20000);

  it('fails if positionId already exists', async () => {
    const openTx1 = await setup(accounts);
    const openTx2 = await setup(accounts);
    openTx2.nonce = openTx1.nonce;

    await callOpenWithoutCounterparty(openTx1);

    await expect(
       callOpenWithoutCounterparty(
         openTx2,
         { shouldContain: true },
       ),
     ).rejects.toThrow(/VM Exception while processing transaction: revert/);
     // works with different nonce
    openTx2.nonce = openTx1.nonce.plus(1);
    await callOpenWithoutCounterparty(openTx2);
  }, 10000);

  it('can transfer position from one address to other', async () => {
    const openTx  = await setup(accounts);

    const receiver = accounts[5];

    const tx = await callOpenWithoutCounterparty(openTx);
    openTx.id = tx.id;

    await dydx.margin.transferPosition(
                        openTx.id,
                        receiver,
                        openTx.positionOwner);
    const positionTransferred = await dydx.margin.getPosition(openTx.id);

    expect(receiver).toEqual(positionTransferred.owner);
  });

   // Validations of the input
  it('fails if loan owner is 0', async () => {
    const openTx = await setup(accounts);
    openTx.loanOwner = ADDRESSES.ZERO;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if position owner is 0', async () => {
    const openTx = await setup(accounts);
    openTx.positionOwner = ADDRESSES.ZERO;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if principal is 0', async () => {
    const openTx = await setup(accounts);
    openTx.principal = BIG_NUMBERS.ZERO;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if owedToken is 0', async () => {
    const openTx = await setup(accounts);
    openTx.owedToken = ADDRESSES.ZERO;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if owedToken is equal to held token', async () => {
    const openTx = await setup(accounts);
    openTx.owedToken = openTx.heldToken;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if maxDuration is 0', async () => {
    const openTx = await setup(accounts);
    openTx.maxDuration = BIG_NUMBERS.ZERO;
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });

  it('fails if interestPeriod > maxDuration', async () => {
    const openTx = await setup(accounts);
    openTx.interestPeriod = openTx.maxDuration.plus(1);
    await expect(callOpenWithoutCounterparty(openTx))
          .rejects.toThrow(/VM Exception while processing transaction: revert/);
  });
});
