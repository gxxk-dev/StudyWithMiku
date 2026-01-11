const COUNTER_NAME = 'global-apac'
const COUNTER_LOCATION_HINT = 'apac'

const getCounterStub = (env) => {
  if (!env.ONLINE_COUNTER) {
    throw new Error('ONLINE_COUNTER binding is missing')
  }

  return env.ONLINE_COUNTER.getByName(COUNTER_NAME, {
    locationHint: COUNTER_LOCATION_HINT
  })
}

export { getCounterStub }
