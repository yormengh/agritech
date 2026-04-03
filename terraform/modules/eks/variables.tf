variable "cluster_name" {
  type = string
}

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "public_access" {
  type    = bool
  default = false
}

variable "public_access_cidrs" {
  type    = list(string)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
