import { mergeResolvers } from "@graphql-tools/merge";
import { commonResolvers } from "@labelflow/common-resolvers";
import membershipResolvers from "./membership";
import userResolvers from "./user";
import workspaceResolvers from "./workspace";

export const resolvers = mergeResolvers([
  commonResolvers,
  membershipResolvers,
  userResolvers,
  workspaceResolvers,
]);
