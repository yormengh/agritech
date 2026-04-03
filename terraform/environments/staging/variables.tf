variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "developer_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}
