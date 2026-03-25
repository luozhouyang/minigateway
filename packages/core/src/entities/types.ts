// Entity type definitions - exported from schema
// These types are used for type hints in the business logic layer

// Re-export types from schema
export type {
  Service,
  Route,
  Upstream,
  Target,
  Consumer,
  Plugin as PluginBinding,
  Credential,
  LlmProvider,
  LlmModel,
  CreateServiceInput,
  CreateRouteInput,
  CreateUpstreamInput,
  CreateTargetInput,
  CreateConsumerInput,
  CreatePluginBindingInput,
  CreateCredentialInput,
  CreateLlmProviderInput,
  CreateLlmModelInput,
} from "../storage/schema.js";
