import { TENDERLY_DASHBOARD_BASE_URL, CHAIN_ID_NETWORK_NAME_MAP } from "../../../common/constants";
import {
  API_VERIFICATION_REQUEST_ERR_MSG,
  BYTECODE_MISMATCH_ERR_MSG,
  NO_NEW_CONTRACTS_VERIFIED_ERR_MSG,
  NO_VERIFIABLE_CONTRACTS_ERR_MSG,
  NETWORK_FETCH_FAILED_ERR_MSG,
  LATEST_BLOCK_NUMBER_FETCH_FAILED_ERR_MSG,
  ACCESS_TOKEN_NOT_PROVIDED_ERR_MSG,
  PRINCIPAL_FETCH_FAILED_ERR_MSG,
  PROJECTS_FETCH_FAILED_ERR_MSG,
} from "../common/errors";
import {
  Principal,
  Project,
  TenderlyNetwork,
  ContractResponse,
  TenderlyContractUploadRequest,
  TenderlyForkContractUploadRequest,
} from "../types";
import { logger } from "../../../utils/logger";
import { TenderlyApiService } from "./TenderlyApiService";
import {
  convertToLogCompliantApiError,
  convertToLogCompliantNetworks,
  convertToLogCompliantProjects,
  convertToLogCompliantVerificationResponse
} from "../../../utils/log-compliance";

export class TenderlyService {
  private pluginName: string;

  constructor(pluginName: string) {
    this.pluginName = pluginName;
  }

  public async getNetworks(): Promise<TenderlyNetwork[]> {
    logger.debug("Obtaining public networks.");

    let tenderlyApi = TenderlyApiService.configureAnonymousInstance();
    if (TenderlyApiService.isAuthenticated()) {
      tenderlyApi = TenderlyApiService.configureInstance();
    }

    try {
      const res = await tenderlyApi.get("/api/v1/public-networks");
      if (res.data === undefined || res.data === null) {
        logger.error("There was an error while obtaining public networks from Tenderly. Obtained response is invalid.");
        return [];
      }
      const logCompliantNetworks = convertToLogCompliantNetworks(res.data);
      logger.silly("Obtained public networks:", logCompliantNetworks);

      return res.data;
    } catch (err) {
      const logCompliantApiErr = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiErr);
      console.log(`Error in ${this.pluginName}: ${NETWORK_FETCH_FAILED_ERR_MSG}`);
    }
    return [];
  }

  public async getLatestBlockNumber(networkId: string): Promise<string | null> {
    logger.debug("Getting latest block number.");

    let tenderlyApi = TenderlyApiService.configureAnonymousInstance();
    if (TenderlyApiService.isAuthenticated()) {
      tenderlyApi = TenderlyApiService.configureInstance();
    }

    try {
      const res = await tenderlyApi.get(`/api/v1/network/${networkId}/block-number`);
      if (res.data === undefined || res.data === null) {
        logger.error(
          "There was an error while obtaining latest block number from Tenderly. Obtained response is invalid."
        );
        return null;
      }
      logger.trace(`Api successfully returned: ${res.data.block_number}`);

      return res.data.block_number;
    } catch (err) {
      const logCompliantApiErr = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiErr);
      logger.error(`Error in ${this.pluginName}: ${LATEST_BLOCK_NUMBER_FETCH_FAILED_ERR_MSG}`);
    }
    return null;
  }

  public async verifyContracts(request: TenderlyContractUploadRequest): Promise<void> {
    logger.debug("Verifying contracts publicly.");

    let tenderlyApi = TenderlyApiService.configureAnonymousInstance();
    if (TenderlyApiService.isAuthenticated()) {
      tenderlyApi = TenderlyApiService.configureInstance();
    }

    try {
      if (request.contracts.length === 0) {
        logger.error(NO_VERIFIABLE_CONTRACTS_ERR_MSG);
        return;
      }

      const res = await tenderlyApi.post("/api/v1/public/verify-contracts", { ...request });
      if (res.data === undefined || res.data === null) {
        logger.error(
          "There was an error while publicly verifying contracts on Tenderly. Obtained response is invalid."
        );
        return;
      }
      const logCompliantVerificationResponse = convertToLogCompliantVerificationResponse(res.data);
      logger.trace("Verification response:", logCompliantVerificationResponse);

      const responseData: ContractResponse = res.data;
      if (responseData.bytecode_mismatch_errors !== null) {
        logger.error(`Error in ${this.pluginName}: ${BYTECODE_MISMATCH_ERR_MSG}`);
        return;
      }

      if (responseData.contracts === undefined || responseData.contracts === null) {
        logger.error("There was an error during public verification. There are no returned contracts.");
        return;
      }

      if (responseData.contracts.length === 0) {
        let addresses = "";
        for (const cont of request.contracts) {
          addresses += `${cont.contractName}, `;
        }

        logger.error(`Error in ${this.pluginName}: ${NO_NEW_CONTRACTS_VERIFIED_ERR_MSG}`, addresses);
        return;
      }

      console.log("Smart Contracts successfully verified");
      console.group();

      for (const contract of responseData.contracts) {
        const contractLink = `${TENDERLY_DASHBOARD_BASE_URL}/contract/${
          CHAIN_ID_NETWORK_NAME_MAP[contract.network_id]
        }/${contract.address}`;
        console.log(`Contract ${contract.address} verified. You can view the contract at ${contractLink}`);
      }
      console.groupEnd();
    } catch (err) {
      const logCompliantApiError = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiError);
      logger.error(`Error in ${this.pluginName}: ${API_VERIFICATION_REQUEST_ERR_MSG}`);
    }
  }

  public async pushContracts(
    request: TenderlyContractUploadRequest,
    tenderlyProject: string,
    username: string
  ): Promise<void> {
    logger.debug("Pushing contracts onto Tenderly.");
    if (!TenderlyApiService.isAuthenticated()) {
      logger.error(`Error in ${this.pluginName}: ${ACCESS_TOKEN_NOT_PROVIDED_ERR_MSG}`);
      return;
    }

    const tenderlyApi = TenderlyApiService.configureInstance();
    try {
      const res = await tenderlyApi.post(`/api/v1/account/${username}/project/${tenderlyProject}/contracts`, {
        ...request,
      });
      if (res.data === undefined || res.data === null) {
        logger.error("There was an error while pushing contracts to Tenderly. Obtained response is invalid.");
        return;
      }
      const logCompliantVerificationResponse = convertToLogCompliantVerificationResponse(res.data);
      logger.trace("Verification response:", logCompliantVerificationResponse);

      const responseData: ContractResponse = res.data;
      if (responseData.bytecode_mismatch_errors !== null) {
        logger.error(`Error in ${this.pluginName}: ${BYTECODE_MISMATCH_ERR_MSG}`);
        return;
      }

      if (responseData.contracts.length === 0) {
        let addresses = "";
        for (const cont of request.contracts) {
          addresses += `${cont.contractName}, `;
        }

        logger.error(`Error in ${this.pluginName}: ${NO_NEW_CONTRACTS_VERIFIED_ERR_MSG}`, addresses);
        return;
      }

      const dashLink = `${TENDERLY_DASHBOARD_BASE_URL}/${username}/${tenderlyProject}/contracts`;
      console.log(
        `Successfully privately verified Smart Contracts for project ${tenderlyProject}. You can view your contracts at ${dashLink}`
      );
    } catch (err) {
      const logCompliantApiError = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiError);
      logger.error(`Error in ${this.pluginName}: ${API_VERIFICATION_REQUEST_ERR_MSG}`);
    }
  }

  public async verifyForkContracts(
    request: TenderlyForkContractUploadRequest,
    tenderlyProject: string,
    username: string,
    fork: string
  ): Promise<void> {
    logger.info("Verifying contracts on fork.");

    if (!TenderlyApiService.isAuthenticated()) {
      logger.error(`Error in ${this.pluginName}: ${ACCESS_TOKEN_NOT_PROVIDED_ERR_MSG}`);
      return;
    }

    const tenderlyApi = TenderlyApiService.configureTenderlyRPCInstance();
    try {
      const res = await tenderlyApi.post(`/account/${username}/project/${tenderlyProject}/fork/${fork}/verify`, {
        ...request,
      });
      if (res.data === undefined || res.data === null) {
        logger.error("There was an error while verifying contracts on fork. Obtained response is invalid.");
      }
      const logCompliantVerificationResponse = convertToLogCompliantVerificationResponse(res.data);
      logger.trace("Verification response:", logCompliantVerificationResponse);

      const responseData: ContractResponse = res.data;
      if (responseData.bytecode_mismatch_errors !== null) {
        logger.error(BYTECODE_MISMATCH_ERR_MSG);
        return;
      }

      if (responseData.contracts.length === 0) {
        let addresses = "";
        for (const cont of request.contracts) {
          addresses += `${cont.contractName}, `;
        }

        logger.error(`Error in ${this.pluginName}: ${NO_NEW_CONTRACTS_VERIFIED_ERR_MSG}`, addresses);
        return;
      }

      console.group();
      for (const contract of responseData.contracts) {
        console.log(`Contract at ${contract.address} verified.`);
      }
      console.groupEnd();
    } catch (err) {
      const logCompliantApiError = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiError);
      logger.error(`Error in ${this.pluginName}: ${API_VERIFICATION_REQUEST_ERR_MSG}`);
    }
  }

  public async getPrincipal(): Promise<Principal | null> {
    logger.debug("Getting principal.");

    if (!TenderlyApiService.isAuthenticated()) {
      logger.error(`Error in ${this.pluginName}: ${ACCESS_TOKEN_NOT_PROVIDED_ERR_MSG}`);
      return null;
    }

    const tenderlyApi = TenderlyApiService.configureInstance();
    try {
      const res = await tenderlyApi.get("/api/v1/user");
      if (res.data === undefined || res.data === null) {
        logger.error("There was an error while obtaining principal from Tenderly. Obtained response is invalid.");
      }
      logger.trace("Retrieved data:", { id: res.data.user.id });

      return {
        id: res.data.user.id,
        username: res.data.user.username,
      };
    } catch (err) {
      const logCompliantApiError = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiError);
      logger.error(`Error in ${this.pluginName}: ${PRINCIPAL_FETCH_FAILED_ERR_MSG}`);
    }
    return null;
  }

  public async getProjectSlugs(principalId: string): Promise<Project[]> {
    logger.debug("Getting project slugs.");

    if (!TenderlyApiService.isAuthenticated()) {
      logger.error(`Error in ${this.pluginName}: ${ACCESS_TOKEN_NOT_PROVIDED_ERR_MSG}`);
      return [];
    }

    const tenderlyApi = TenderlyApiService.configureInstance();
    try {
      const res = await tenderlyApi.get(`/api/v1/account/${principalId}/projects`);
      if (res.data === undefined || res.data === null) {
        logger.error("There was an error while obtaining project slug from Tenderly. Obtained response is invalid.");
      }
      const logCompliantProjects = convertToLogCompliantProjects(res.data.projects);
      logger.trace("Obtained projects:", logCompliantProjects);

      return res.data.projects;
    } catch (err) {
      const logCompliantApiError = convertToLogCompliantApiError(err);
      logger.error(logCompliantApiError);
      logger.error(`Error in ${this.pluginName}: ${PROJECTS_FETCH_FAILED_ERR_MSG}`);
    }
    return [];
  }
}
