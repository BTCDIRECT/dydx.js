import BigNumber  from 'bignumber.js';
import web3Utils from 'web3-utils';
import { Contract, Provider } from '../types';

export function setupContract(
  contract: Contract,
  provider: Provider,
  networkId: number,
): void {
  contract.setProvider(provider);
  contract.setNetwork(networkId);
}

export function getPositionId(
  trader: string,
  nonce: BigNumber,
): string {
  return web3Utils.soliditySha3(
    trader,
    nonce,
  );
}

export function convertInterestRateToProtocol(
  interestRate: BigNumber,
): BigNumber {
  return interestRate.mul(new BigNumber('10e6')).floor();
}

export function convertInterestRateFromProtocol(
  interestRate: BigNumber,
): BigNumber {
  return interestRate.div(new BigNumber('10e6')).floor();
}
