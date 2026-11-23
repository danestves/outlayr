internal import ExpoModulesCore

final class SharedStoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SharedStore")

    Function("get") { (key: String) -> String? in
      SharedStore.store?.string(forKey: key)
    }

    Function("set") { (key: String, value: String) in
      SharedStore.store?.set(value, forKey: key)
    }

    Function("remove") { (key: String) in
      SharedStore.store?.removeObject(forKey: key)
    }

    Function("captureKeyStatus") { () -> String in
      CaptureLookup.keyStatus()
    }

    Function("setCaptureKey") { (key: String?) -> Bool in
      CaptureLookup.setKey(key)
    }

    Function("claimQueue") { (name: String) throws -> Bool in
      try SharedStore.claimQueue(as: name)
    }

    Function("queueSequence") { () throws -> Double in
      Double(try SharedStore.queueSequence())
    }

    Function("eraseQueue") { () throws -> Void in
      try SharedStore.eraseQueue()
    }
  }
}
