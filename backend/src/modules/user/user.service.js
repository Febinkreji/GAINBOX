import { userRepository } from './user.repository.js'

export const userService = {
  async list(_pagination) {
    return userRepository.findAll()
  },

  async getById(id) {
    return userRepository.findById(id)
  },

  async create(data) {
    return userRepository.create(data)
  },

  async update(id, data) {
    return userRepository.update(id, data)
  },

  async remove(id) {
    return userRepository.delete(id)
  },
}
