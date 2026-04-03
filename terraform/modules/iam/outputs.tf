output "github_actions_role_arn" { value = aws_iam_role.github_actions.arn }
output "backend_app_role_arn"    { value = aws_iam_role.backend_app.arn }
output "github_oidc_arn"         { value = aws_iam_openid_connect_provider.github.arn }
