# Release and Deployment Safety

Use this lens for a deployment, infrastructure mutation, schema rollout, or
configuration change with meaningful external impact.

Before execution, establish:

- target environment, account, subscription, cluster, region, and identity;
- exact diff or artifact being applied and its blast radius;
- backward compatibility during a partial rollout;
- migration order, especially expand/migrate/contract for schema changes;
- rollback or recovery path and what data/configuration makes rollback unsafe;
- canary, progressive exposure, or pause point where the platform supports it;
- observable signal that decides continue, pause, or rollback.

Local manifests, workflow files, images, and Terraform code can be iterated
normally. Applying them to shared or production state, publishing an image,
changing permissions or secrets, and deploying are external mutations. Show
the impact and require explicit authorization unless the current request
already clearly authorizes that exact operation.

After execution, observe the relevant health, error, latency, capacity,
deployment, and data signals. A command succeeding proves only that the
platform accepted the operation; it does not prove that users are receiving
correct behavior.
