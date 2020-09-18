import { NGMDot } from "./interfaces/ngm-dot"
import read_dot from "./subroutines/read-dot"
import { status } from "./git-commands"
import { ModuleWithStatus } from "./interfaces/status"

interface StatusArgs {
  project?: string
}

class NGMApi {

  private static _instance?: NGMApi

  private ngm_dot: NGMDot

  public static get Instance() {
    if (!this._instance) throw new Error('You must call and wait for NGMApi::Init() to resolve before you can call this')
    return this._instance
  }

  public static async Init(root: string | NGMDot) {
    this._instance = new NGMApi(
      typeof root === 'string'
        ? await read_dot(root)
        : root
    )
    return this._instance
  }

  private constructor(ngm_dot: NGMDot) {
    this.ngm_dot = ngm_dot
  }

  public status(): Promise<ModuleWithStatus[]> {
    return status(this.ngm_dot.modules)
  }

}

export default NGMApi
