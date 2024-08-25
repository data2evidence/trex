import jwt from 'npm:jsonwebtoken'
import {env} from "../env.ts"

const subProp = env.GATEWAY_IDP_SUBJECT_PROP

export function addSub(c) {
if (c.req.raw.user && !c.req.raw.user['sub']) {
    const token = getDecodedToken(c.req.raw)
    if (token) {
      c.req.raw.user['sub'] = token[subProp]
    }
  }

  //console.log(c.req)
}


const getDecodedToken = (req: Request) => {
  const authHeader = req.headers["authorization"]
  if (!authHeader) {
    return null
  }
  const token = authHeader.replace(/bearer /i, '')
  const decodedToken = jwt.decode(token) as jwt.JwtPayload

  return decodedToken
}