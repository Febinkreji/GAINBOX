import { notImplemented } from '../utils/notImplemented.js'

/**
 * Documents the contract every domain repository implements, so the shape is
 * consistent before any of them has real SQL behind it. Domain repositories
 * extend this and override each method; none of the bodies here are meant
 * to be called directly.
 */
export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
  }

  async findById(_id) {
    notImplemented(`${this.constructor.name}.findById`)
  }

  async findAll(_filters, _pagination) {
    notImplemented(`${this.constructor.name}.findAll`)
  }

  async create(_data) {
    notImplemented(`${this.constructor.name}.create`)
  }

  async update(_id, _data) {
    notImplemented(`${this.constructor.name}.update`)
  }

  async delete(_id) {
    notImplemented(`${this.constructor.name}.delete`)
  }
}
