#!/usr/bin/env bash
# One-time setup: lets GitHub Actions deploy this stack to your AWS account
# without storing any long-lived AWS access keys as GitHub secrets. Run this
# once, wherever you have AWS CLI credentials configured (aws configure).
#
# What it creates:
#   - An OIDC identity provider trusting GitHub Actions (skipped if you
#     already have one — most accounts that use GitHub Actions with AWS do)
#   - An IAM role that GitHub Actions can assume, but ONLY from workflow runs
#     on the main branch of bkraft904/stratum-xray-passport
#   - Permissions on that role: PowerUserAccess (broad, but excludes IAM
#     user/group management) plus a small IAM pass-through policy scoped to
#     just this stack's Lambda execution role, which SAM needs to create.

set -euo pipefail

# GitHub's OIDC "sub" claim includes the immutable numeric owner/repo IDs
# alongside the names (repo:OWNER@OWNER_ID/REPO@REPO_ID:ref:...), not just
# "OWNER/REPO" as most tutorials assume — confirmed by decoding an actual
# token from this repo's workflow runs. These IDs are specific to
# bkraft904/stratum-xray-passport.
REPO_OWNER="bkraft904"
REPO_OWNER_ID="312739601"
REPO_NAME="stratum-xray-passport"
REPO_ID="1337419750"
ROLE_NAME="stratum-github-deploy"
STACK_NAME="stratum-scan-lab"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Account: $ACCOUNT_ID"
echo "Repo:    $REPO_OWNER/$REPO_NAME"
echo

echo "1/4 — Checking for existing GitHub OIDC provider..."
if aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" \
  >/dev/null 2>&1; then
  echo "     Already exists, skipping."
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea9
  echo "     Created."
fi

echo "2/4 — Creating IAM role ($ROLE_NAME)..."
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:${REPO_OWNER}@${REPO_OWNER_ID}/${REPO_NAME}@${REPO_ID}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST_POLICY"
  echo "     Role already existed, updated trust policy."
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_POLICY"
  echo "     Created."
fi

echo "3/4 — Attaching permissions..."
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

IAM_PASSTHROUGH_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PassRole",
        "iam:TagRole"
      ],
      "Resource": "arn:aws:iam::${ACCOUNT_ID}:role/${STACK_NAME}-*"
    }
  ]
}
EOF
)
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name stratum-iam-passthrough \
  --policy-document "$IAM_PASSTHROUGH_POLICY"
echo "     Done."

echo "4/4 — Role ARN (copy this into the AWS_DEPLOY_ROLE_ARN GitHub secret):"
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text
