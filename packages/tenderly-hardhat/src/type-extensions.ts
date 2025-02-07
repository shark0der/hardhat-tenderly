import "hardhat/types/config";
import "hardhat/types/runtime";

import { TenderlyContractUploadRequest, TenderlyForkContractUploadRequest } from "tenderly/types";

import { ContractByName, TenderlyConfig } from "./tenderly/types";
import { TenderlyNetwork } from "./TenderlyNetwork";

export interface TenderlyPlugin {
  /** *
   * @description This function is utilizing hre in order to extract all needed contract and compilation data in order to trigger contract verification.
   * @param contracts - Variadic list of all contracts to be verified. Consisting of `name` and `address`
   */
  verify: (...contracts: ContractByName[]) => Promise<void>;
  /** *
   * @description No magic, just direct access to tenderly contract verification API
   * @param request - raw contract verification request field
   */
  verifyAPI: (request: TenderlyContractUploadRequest) => Promise<void>;
  /** *
   * @description Verifying deployed contracts on fork via API.
   * @param request - raw contract verification request param
   * @param tenderlyProject - Tenderly project name
   * @param username - Tenderly project username (or organization username)
   * @param forkID - Fork id on which verification is occurring
   */
  verifyForkAPI: (
    request: TenderlyForkContractUploadRequest,
    tenderlyProject: string,
    username: string,
    forkID: string
  ) => Promise<void>;
  /** *
   * @description Persisting contract deployment data needed for verification purposes using hre.
   * @param contracts - List of contract names and addresses.s
   */
  persistArtifacts: (...contracts: ContractByName[]) => Promise<void>;

  /** *
   * @deprecated
   */
  pushAPI: (request: TenderlyContractUploadRequest, tenderlyProject: string, username: string) => Promise<void>;
  /** *
   * @deprecated
   */
  push: (...contracts: ContractByName[]) => Promise<void>;

  /** *
   * @deprecated
   */
  network: () => TenderlyNetwork;
  /** *
   * @deprecated
   */
  setNetwork: (network: TenderlyNetwork) => TenderlyNetwork;
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    tenderly: TenderlyPlugin;
    tenderlyNetwork: {
      send: (
        request: {
          method: string;
          params?: any[];
        },
        callback: (error: any, response: any) => void
      ) => void;
      verify: (...contracts: any[]) => Promise<void>;
      verifyAPI: (
        request: TenderlyForkContractUploadRequest,
        tenderlyProject: string,
        username: string,
        forkID: string
      ) => Promise<void>;
      resetFork: () => string | undefined;
      getHead: () => string | undefined;
      setHead: (head: string | undefined) => void;
      getFork: () => Promise<string | undefined>;
      setFork: (fork: string | undefined) => void;
      initializeFork: () => Promise<void>;
    };
  }
}

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    tenderly?: TenderlyConfig;
  }

  export interface HardhatConfig {
    tenderly: TenderlyConfig;
  }
}
