import { surfboardConfig } from '../../../config/surfboard.config.js'
import { notImplemented } from '../../../utils/notImplemented.js'

/**
 * Thin HTTP client wrapper around Surfboard's API. No request is made from
 * here yet — this exists so every adapter shares one place that knows how
 * to authenticate and reach Surfboard, instead of each adapter building its
 * own request logic.
 */
export const surfboardClient = {
  baseUrl: surfboardConfig.baseUrl,

  async request(_method, _path, _payload) {
    notImplemented('SurfboardClient.request')
  },
}
