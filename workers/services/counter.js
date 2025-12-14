const getCounterStub = (env) => {
  const id = env.ONLINE_COUNTER.idFromName('global')
  return env.ONLINE_COUNTER.get(id)
}

export { getCounterStub }
