import View from"./view.mjs";import*as util from"../../../common/utils/helpers.mjs";export default class APIVIew extends View{route="/api/status";_methods=["get"];async handleGet(e,s){const{game:t,release:i}=globalThis,r={active:!1,version:i?.version};t.ready&&util.mergeObject(r,{active:!0,world:t.world.id,system:t.system.id,systemVersion:t.system.version,users:Object.values(t.activity.users).length,uptime:t.activity.serverTime}),s.json(r)}}