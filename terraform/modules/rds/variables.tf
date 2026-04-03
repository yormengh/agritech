variable "cluster_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "isolated_subnet_ids" {
  type = list(string)
}

variable "eks_node_security_group_id" {
  type = string
}

variable "db_name" {
  type    = string
  default = "agroconnect"
}

variable "db_username" {
  type    = string
  default = "agro_admin"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "multi_az" {
  type    = bool
  default = true
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "skip_final_snapshot" {
  type    = bool
  default = false
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}
