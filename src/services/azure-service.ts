import { DefaultAzureCredential } from "@azure/identity";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { ResourceManagementClient } from "@azure/arm-resources";
import type { Subscription } from "@azure/arm-subscriptions";
import type { GenericResource } from "@azure/arm-resources";

export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
  tags?: Record<string, string>;
}

export class AzureService {
  private credential: DefaultAzureCredential;
  private subscriptionClient: SubscriptionClient;

  constructor() {
    this.credential = new DefaultAzureCredential();
    this.subscriptionClient = new SubscriptionClient(this.credential);
  }

  async getSubscriptions(): Promise<AzureSubscription[]> {
    try {
      const subscriptions: AzureSubscription[] = [];

      for await (const subscription of this.subscriptionClient.subscriptions.list()) {
        subscriptions.push({
          subscriptionId: subscription.subscriptionId || "",
          displayName: subscription.displayName || "",
          state: subscription.state || "",
        });
      }

      return subscriptions;
    } catch (error) {
      throw new Error(
        `Failed to fetch subscriptions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getResources(subscriptionId?: string): Promise<AzureResource[]> {
    try {
      let targetSubscriptionId = subscriptionId;

      if (!targetSubscriptionId) {
        const subscriptions = await this.getSubscriptions();
        if (subscriptions.length === 0) {
          throw new Error("No subscriptions found");
        }
        targetSubscriptionId = subscriptions[0].subscriptionId;
      }

      const resourceClient = new ResourceManagementClient(
        this.credential,
        targetSubscriptionId
      );
      const resources: AzureResource[] = [];

      for await (const resource of resourceClient.resources.list()) {
        const resourceGroupName = this.extractResourceGroupFromId(
          resource.id || ""
        );

        resources.push({
          id: resource.id || "",
          name: resource.name || "",
          type: resource.type || "",
          location: resource.location || "",
          resourceGroup: resourceGroupName,
          tags: resource.tags || {},
        });
      }

      return resources;
    } catch (error) {
      throw new Error(
        `Failed to fetch resources: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private extractResourceGroupFromId(resourceId: string): string {
    const match = resourceId.match(/\/resourceGroups\/([^\/]+)/);
    return match ? match[1] : "Unknown";
  }
}
