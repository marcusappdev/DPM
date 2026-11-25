# "Read automatically": AWS setup

"Read automatically" sends one scanned page at a time to Claude on Amazon Bedrock and fills the batch form with what it reads. A person still checks every value before saving.

- **What gets created:** `dpm-reader.yaml` sets up three small pieces in one go: a Lambda function, an HTTP API, and a sign-in check that only lets in people signed in to the Hub.
- **Where pages go:** the **Australia** inference profile (`au.`) keeps the pages in Australian AWS regions.
- **What's stored:** nothing. Pages aren't saved anywhere in AWS. The logs record only token counts and errors, and are kept for 14 days.
- **Review the batch** uses the same service. It sends the batch as text, with no page images, to Claude Sonnet, once per batch.
- **Cost:** about **US$0.005 per page** for reading (Claude Haiku), and about **US$0.03–0.06 per review** (Claude Sonnet, depending on the size of the batch). The Lambda and API costs are a few cents a month at this volume.

**POC:** the RPYC proof-of-concept AWS account, region **Asia Pacific (Sydney) `ap-southeast-2`**. When the Hub moves to DPM, deploy the same template in DPM's own AWS account.

## Steps (about 15 minutes, all in the AWS web console)

1. **Sign in** to the POC AWS account. At the top right, set the region to **Asia Pacific (Sydney)**.
2. **Make sure Claude can be used:**
   1. Open **Amazon Bedrock**, then **Model catalog**, search for **Claude Haiku 5.5** and open it.
   2. If a box asks for Anthropic *use case details*, fill it in once. For example: *"Reading scanned payroll forms for a document register (proof of concept)."*
   3. To check access, click **Open in playground** and send "hello". If it answers, access is working.
3. **Download the template:** in the GitHub repo, open `aws/dpm-reader.yaml` and click the **Download raw file** button.
4. **Create the service:**
   1. Open **CloudFormation**, then **Create stack** > **With new resources (standard)** > **Upload a template file**, and choose `dpm-reader.yaml`. Click **Next**.
   2. Stack name: `dpm-reader`.
   3. Parameters: leave them as they are. They're already set to Concept's tenant, the Hub's client ID, the Australian Haiku profile and `https://marcusappdev.github.io`. Click **Next**.
   4. Click **Next** again, then at the bottom tick **"I acknowledge that AWS CloudFormation might create IAM resources"** and click **Submit**.
   5. Wait for **CREATE_COMPLETE**, about 2 minutes.
5. **Copy the address:** open the stack's **Outputs** tab and copy **ReadUrl**. It looks like `https://abc123.execute-api.ap-southeast-2.amazonaws.com/read`.
6. **Switch it on in the Hub:** sign in as Admin and open **Settings**.
   - Click **AwsApiUrl** and paste the ReadUrl.
   - Click **ReadAutomatically** and set it to `Test`.
7. **Try it:**
   1. Open a batch and go to **4 · Scanned batch**.
   2. Load a scanned PDF and click **Read automatically** on one page.
   3. The page shows **Read ✓**, and the values it filled are highlighted.

## Adding "Review the batch" to a stack that's already running

The stack needs the updated template, which adds a `ReviewModelId` parameter (Claude Sonnet 4.5, Australia profile). Do this in **CloudShell** (the `>_` icon at the top of the console, region Sydney).

1. **Check Sonnet answers.** Paste:
   ```
   aws bedrock-runtime converse --model-id au.anthropic.claude-sonnet-4-5-20250929-v1:0 --messages '[{"role":"user","content":[{"text":"hello"}]}]' --query 'output.message.content[0].text'
   ```
   It should reply with a greeting. A *ThrottlingException* means the account's Sonnet quota is 0: in **Service Quotas** > **Amazon Bedrock**, look for the *Claude Sonnet 4.5* cross-region requests and tokens per minute and request an increase.
2. **Get the new template:**
   ```
   curl -sO https://raw.githubusercontent.com/marcusappdev/DPM/main/aws/dpm-reader.yaml
   ```
3. **Update the stack.** This keeps Haiku for reading pages:
   ```
   aws cloudformation deploy --stack-name dpm-reader --template-file dpm-reader.yaml --capabilities CAPABILITY_IAM --parameter-overrides ModelId=au.anthropic.claude-haiku-4-5-20251001-v1:0 ReviewModelId=au.anthropic.claude-sonnet-4-5-20250929-v1:0
   ```
   Wait for *Successfully created/updated stack*. The ReadUrl doesn't change, so there's nothing to update in the Hub.

## If something goes wrong

| Message in the Hub | Fix |
| --- | --- |
| *the reading service didn't accept your sign-in* | The stack's **TenantId** or **ClientId** parameter is wrong. In CloudFormation, use **Update** > *Use current template* to correct it. |
| *AccessDeniedException … model* | Claude isn't enabled in this account yet. Repeat step 2. |
| *ValidationException … model identifier is invalid* | Update the stack's **ModelId** parameter to `au.anthropic.claude-haiku-4-5-20251001-v1:0`. |
| The button does nothing, and the browser console shows **CORS** | The **AllowedOrigin** parameter must be exactly `https://marcusappdev.github.io`, with no slash at the end. |
| *the AWS service hasn't been updated for reviews yet* | Do "Adding Review the batch" above. |
| *the review took longer than 30 seconds* | The API waits 30 seconds at most. Press **Review again**; very large batches may need it twice. |
| *too many pages at once* | The API allows about 3 pages a second. Wait a moment and click **Read all pages** again. It skips pages already read. |

- **Error details:** look in **CloudWatch** > **Log groups** > `/aws/lambda/dpm-reader-reader`.
- **To switch off:** set **ReadAutomatically** to `Off` in the Hub. To remove everything, delete the `dpm-reader` stack.
