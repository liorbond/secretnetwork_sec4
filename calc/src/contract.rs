use cosmwasm_std::{to_binary, Api, Binary, Env, Extern, HandleResponse, InitResponse, Querier, StdError, StdResult, Storage, Uint128, HumanAddr};
use std::convert::TryFrom;
use num_integer::Roots;
use crate::msg::{HandleMsg, InitMsg, QueryMsg, HandleAnswer, QueryAnswer};
use crate::state::{load, may_load, save_eq, EquationVariables, UserCalculation};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: InitMsg,
) -> StdResult<InitResponse> {
    Ok(InitResponse::default())
}

fn try_add<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    eq: EquationVariables,
) -> StdResult<HandleResponse> {
    let status: String;
    let mut response = "".to_string();

    if (u128::MAX - eq.x.u128()) < eq.y.u128() {
        status = String::from("Equation exceeds the limit");
    } else {
        let result = eq.x.u128() + eq.y.u128();
        response = result.to_string();

        let sender_address = deps.api.canonical_address(&env.message.sender)?;
        let stored_calculation = UserCalculation{
            eq,
            op: String::from("Add"),
            res: response.clone(),
            timestamp: env.block.time
        };

        save_eq(&mut deps.storage, &sender_address.as_slice().to_vec(), stored_calculation)?;
    }


    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::Add {
            res: response
        })?),
    })
}

fn try_sub<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    eq: EquationVariables,
) -> StdResult<HandleResponse> {
    let status: String;
    let mut response = "".to_string();

    if eq.x.u128() < eq.y.u128() {
        status = String::from("Equation exceeds the limit");
    } else {
        let result = eq.x.u128() - eq.y.u128();
        response = result.to_string();

        let sender_address = deps.api.canonical_address(&env.message.sender)?;
        let stored_calculation = UserCalculation{
            eq,
            op: String::from("Sub"),
            res: response.clone(),
            timestamp: env.block.time
        };

        save_eq(&mut deps.storage, &sender_address.as_slice().to_vec(), stored_calculation)?;
    }


    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::Sub {
            res: response
        })?),
    })
}

fn is_mul_overflows(eq : &EquationVariables) -> bool {
    let mul : u128 = eq.x.u128() * eq.y.u128();
    return (eq.y.u128() != 0) && ((mul / eq.y.u128()) != eq.x.u128());
}

fn try_mul<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    eq: EquationVariables,
) -> StdResult<HandleResponse> {
    let status: String;
    let mut response = String::from("");

    if is_mul_overflows(&eq) {
        status = String::from("Equation exceeds the limit");
    } else {
        let result = eq.x.u128() * eq.y.u128();
        response = result.to_string();

        let sender_address = deps.api.canonical_address(&env.message.sender)?;
        let stored_calculation = UserCalculation{
            eq,
            op: String::from("Mul"),
            res: response.clone(),
            timestamp: env.block.time
        };

        save_eq(&mut deps.storage, &sender_address.as_slice().to_vec(), stored_calculation)?;
    }


    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::Mul {
            res: response
        })?),
    })
}

fn uint_parts_to_string(x : u128) -> String {
    return format!("{}.{}", x / 1000, x % 1000);
}

fn try_div<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    eq: EquationVariables,
) -> StdResult<HandleResponse> {
    let status: String;
    let mut response = "".to_string();

    if (eq.y.u128() == 0) || is_mul_overflows(&EquationVariables{ x: eq.x, y: Uint128::from(1000 as u128) }) {
        status = String::from("Equation exceeds the limit");
    } else {
        let div_result : u128 = (1000 * eq.x.u128()) / eq.y.u128();
        response = uint_parts_to_string(div_result);

        let sender_address = deps.api.canonical_address(&env.message.sender)?;
        let stored_calculation = UserCalculation{
            eq,
            op: String::from("Div"),
            res: response.clone(),
            timestamp: env.block.time
        };

        save_eq(&mut deps.storage, &sender_address.as_slice().to_vec(), stored_calculation)?;
    }


    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::Div {
            res: response
        })?),
    })
}

fn try_sqrt<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    x: Uint128,
) -> StdResult<HandleResponse> {
    let status: String;
    let mut response = "".to_string();

    if is_mul_overflows(&EquationVariables{ x, y: Uint128::from(1000000 as u128) }) {
        status = String::from("Equation exceeds the limit");
    } else {
        let sqrt_result = (((x.u128() * 1000000) as u128).sqrt() as u128);
        response = uint_parts_to_string(sqrt_result);

        let eq = EquationVariables{ x, y: Uint128::from(0 as u128) };
        let stored_calculation = UserCalculation{
            eq,
            op: String::from("Sqrt"),
            res: response.clone(),
            timestamp: env.block.time
        };

        let sender_address = deps.api.canonical_address(&env.message.sender)?;
        save_eq(&mut deps.storage, &sender_address.as_slice().to_vec(), stored_calculation)?;
    }
    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::Sqrt {
            res: response
        })?),
    })
}

fn sign_public_address(address : String) -> String {
    // Obviously it is not really an encrypted address, but it is out of scope here, alternatively we could sign the public address with the contract's private key.
    return address;
}

fn get_cookie<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary(&HandleAnswer::GetCookie {
            cookie: sign_public_address(env.message.sender.to_string())
        })?),
    })
}


pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::Add { eq} => try_add(deps, env, eq),
        HandleMsg::Sub { eq } => try_sub(deps, env, eq),
        HandleMsg::Mul { eq } => try_mul(deps, env, eq),
        HandleMsg::Div { eq } => try_div(deps, env, eq),
        HandleMsg::Sqrt { x } => try_sqrt(deps, env, x),
        HandleMsg::GetCookie {} => get_cookie(deps, env),
    }
}

fn try_get_address( signed_address: String ) -> Option<HumanAddr> {
    return Option::from(HumanAddr { 0: signed_address });
}

fn try_get_user_calculations<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    user_cookie : String
) -> StdResult<Binary> {
    let address = try_get_address(user_cookie);
    match address {
        Some(stored_address) => {
            let user_calculations = may_load(&deps.storage, &deps.api.canonical_address(&stored_address)?.as_slice().to_vec()).ok().unwrap();
            match user_calculations {
                Some(stored_user_calculations) => {
                    to_binary(&QueryAnswer::GetUserCalculations { calculations: stored_user_calculations})
                }
                None => {
                    to_binary(&QueryAnswer::GetUserCalculations { calculations: Vec::new()})
                }
            }

        }
        None => {
            to_binary(&QueryAnswer::GetUserCalculations { calculations: Vec::new() })
        }
    }
}

pub fn query<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetUserCalculations {user_cookie} => try_get_user_calculations(deps, user_cookie),
    }
}