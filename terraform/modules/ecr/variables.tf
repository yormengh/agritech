variable "cluster_name" {
  type = string
}

variable "node_role_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
